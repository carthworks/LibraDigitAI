"""
Batch Processing Module
Handles batch upload, OCR processing, and queue management
"""

import sqlite3
import os
from datetime import datetime
import threading
import time
from queue import Queue
import traceback


class BatchProcessor:
    """Manage batch processing of multiple documents"""
    
    def __init__(self, database_path, upload_folder):
        self.database_path = database_path
        self.upload_folder = upload_folder
        self.processing_threads = {}
        self.batch_queues = {}
        self.batch_status = {}
    
    def get_db(self):
        """Get database connection"""
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def create_batch_job(self, name, file_count):
        """
        Create a new batch job
        
        Args:
            name (str): Batch job name
            file_count (int): Number of files in batch
        
        Returns:
            int: Batch job ID
        """
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO batch_jobs (name, total_files, processed_files, status, created_at)
            VALUES (?, ?, 0, 'pending', CURRENT_TIMESTAMP)
        ''', (name, file_count))
        
        batch_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Initialize batch status tracking
        self.batch_status[batch_id] = {
            'total': file_count,
            'processed': 0,
            'success': 0,
            'failed': 0,
            'current_file': None,
            'status': 'pending'
        }
        
        return batch_id
    
    def add_batch_item(self, batch_id, project_id):
        """
        Add a project to a batch job
        
        Args:
            batch_id (int): Batch job ID
            project_id (int): Project ID
        
        Returns:
            int: Batch item ID
        """
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO batch_items (batch_id, project_id, status)
            VALUES (?, ?, 'pending')
        ''', (batch_id, project_id))
        
        item_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return item_id
    
    def get_batch_status(self, batch_id):
        """
        Get current status of a batch job
        
        Args:
            batch_id (int): Batch job ID
        
        Returns:
            dict: Batch status information
        """
        try:
            conn = self.get_db()
            cursor = conn.cursor()
            
            # Get batch job info
            cursor.execute('SELECT * FROM batch_jobs WHERE id = ?', (batch_id,))
            batch = cursor.fetchone()
            
            if not batch:
                conn.close()
                return None
            
            # Get batch items - use LEFT JOIN to handle missing projects
            cursor.execute('''
                SELECT bi.*, COALESCE(p.filename, 'Unknown') as filename
                FROM batch_items bi
                LEFT JOIN projects p ON bi.project_id = p.id
                WHERE bi.batch_id = ?
                ORDER BY bi.id
            ''', (batch_id,))
            items = cursor.fetchall()
            
            conn.close()
            
            # Count statuses
            status_counts = {
                'pending': 0,
                'processing': 0,
                'completed': 0,
                'failed': 0
            }
            
            items_list = []
            for item in items:
                try:
                    item_dict = dict(item)
                    items_list.append(item_dict)
                    # Safely handle status - default to 'pending' if status is None or unexpected
                    item_status = item_dict.get('status', 'pending')
                    if item_status in status_counts:
                        status_counts[item_status] += 1
                    else:
                        # If status is unexpected, count as pending
                        print(f"⚠️ Unexpected status '{item_status}' for batch item {item_dict.get('id')}, counting as pending")
                        status_counts['pending'] += 1
                except Exception as e:
                    print(f"⚠️ Error processing batch item: {e}")
                    continue
            
            # Calculate progress
            total = len(items)
            processed = status_counts['completed'] + status_counts['failed']
            progress_percent = (processed / total * 100) if total > 0 else 0
            
            # Safely build response dictionary
            batch_dict = dict(batch)
            
            return {
                'id': batch_dict.get('id'),
                'name': batch_dict.get('name', 'Unnamed Batch'),
                'status': batch_dict.get('status', 'unknown'),
                'total_files': batch_dict.get('total_files', 0),
                'processed_files': batch_dict.get('processed_files', 0),
                'created_at': batch_dict.get('created_at', ''),
                'completed_at': batch_dict.get('completed_at'),
                'progress_percent': round(progress_percent, 1),
                'status_counts': status_counts,
                'items': items_list
            }
        except Exception as e:
            print(f"❌ Error in get_batch_status: {str(e)}")
            import traceback
            traceback.print_exc()
            raise  # Re-raise to be caught by the endpoint
    
    def update_batch_item_status(self, item_id, status, error_message=None):
        """Update status of a batch item"""
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE batch_items 
            SET status = ?, error_message = ?
            WHERE id = ?
        ''', (status, error_message, item_id))
        
        conn.commit()
        conn.close()
    
    def update_batch_job_status(self, batch_id, status, processed_count=None):
        """Update status of a batch job"""
        conn = self.get_db()
        cursor = conn.cursor()
        
        if processed_count is not None:
            cursor.execute('''
                UPDATE batch_jobs 
                SET status = ?, processed_files = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status, processed_count, batch_id))
        else:
            cursor.execute('''
                UPDATE batch_jobs 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status, batch_id))
        
        if status == 'completed' or status == 'failed':
            cursor.execute('''
                UPDATE batch_jobs 
                SET completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (batch_id,))
        
        conn.commit()
        conn.close()
    
    def process_batch_ocr(self, batch_id, ocr_callback):
        """
        Process OCR for all items in a batch
        
        Args:
            batch_id (int): Batch job ID
            ocr_callback (function): Function to process OCR for a single project
                                    Should accept project_id and return (success, error_message)
        """
        # Update batch status to processing
        self.update_batch_job_status(batch_id, 'processing')
        
        # Get all batch items
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT bi.id, bi.project_id, p.filename
            FROM batch_items bi
            JOIN projects p ON bi.project_id = p.id
            WHERE bi.batch_id = ? AND bi.status = 'pending'
            ORDER BY bi.id
        ''', (batch_id,))
        
        items = cursor.fetchall()
        conn.close()
        
        total_items = len(items)
        processed_count = 0
        success_count = 0
        failed_count = 0
        
        for item in items:
            item_id = item['id']
            project_id = item['project_id']
            filename = item['filename']
            
            # Update item status to processing
            self.update_batch_item_status(item_id, 'processing')
            
            # Update batch status
            if batch_id in self.batch_status:
                self.batch_status[batch_id]['current_file'] = filename
                self.batch_status[batch_id]['status'] = 'processing'
            
            try:
                # Process OCR
                success, error_message = ocr_callback(project_id)
                
                if success:
                    self.update_batch_item_status(item_id, 'completed')
                    success_count += 1
                else:
                    self.update_batch_item_status(item_id, 'failed', error_message)
                    failed_count += 1
                
            except Exception as e:
                error_msg = f"Error processing {filename}: {str(e)}"
                print(error_msg)
                traceback.print_exc()
                self.update_batch_item_status(item_id, 'failed', error_msg)
                failed_count += 1
            
            processed_count += 1
            
            # Update batch progress
            self.update_batch_job_status(batch_id, 'processing', processed_count)
            
            if batch_id in self.batch_status:
                self.batch_status[batch_id]['processed'] = processed_count
                self.batch_status[batch_id]['success'] = success_count
                self.batch_status[batch_id]['failed'] = failed_count
        
        # Mark batch as completed
        final_status = 'completed' if failed_count == 0 else 'completed_with_errors'
        self.update_batch_job_status(batch_id, final_status, processed_count)
        
        if batch_id in self.batch_status:
            self.batch_status[batch_id]['status'] = final_status
            self.batch_status[batch_id]['current_file'] = None
        
        return {
            'total': total_items,
            'success': success_count,
            'failed': failed_count
        }
    
    def start_batch_processing_async(self, batch_id, ocr_callback):
        """
        Start batch processing in a background thread
        
        Args:
            batch_id (int): Batch job ID
            ocr_callback (function): OCR processing function
        """
        def process_thread():
            try:
                self.process_batch_ocr(batch_id, ocr_callback)
            except Exception as e:
                print(f"Batch processing error: {str(e)}")
                traceback.print_exc()
                self.update_batch_job_status(batch_id, 'failed')
        
        thread = threading.Thread(target=process_thread, daemon=True)
        thread.start()
        
        self.processing_threads[batch_id] = thread
        
        return True
    
    def cancel_batch(self, batch_id):
        """
        Cancel a batch job
        
        Args:
            batch_id (int): Batch job ID
        
        Returns:
            bool: Success status
        """
        # Update batch status
        self.update_batch_job_status(batch_id, 'cancelled')
        
        # Update all pending items
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE batch_items 
            SET status = 'cancelled'
            WHERE batch_id = ? AND status = 'pending'
        ''', (batch_id,))
        
        conn.commit()
        conn.close()
        
        if batch_id in self.batch_status:
            self.batch_status[batch_id]['status'] = 'cancelled'
        
        return True
    
    def get_all_batches(self, limit=50):
        """
        Get all batch jobs
        
        Args:
            limit (int): Maximum number of batches to return
        
        Returns:
            list: List of batch jobs
        """
        conn = self.get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM batch_jobs 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (limit,))
        
        batches = cursor.fetchall()
        conn.close()
        
        return [dict(batch) for batch in batches]
    
    def delete_batch(self, batch_id):
        """
        Delete a batch job and all its items
        
        Args:
            batch_id (int): Batch job ID
        
        Returns:
            bool: Success status
        """
        conn = self.get_db()
        cursor = conn.cursor()
        
        # Delete batch items
        cursor.execute('DELETE FROM batch_items WHERE batch_id = ?', (batch_id,))
        
        # Delete batch job
        cursor.execute('DELETE FROM batch_jobs WHERE id = ?', (batch_id,))
        
        conn.commit()
        conn.close()
        
        # Clean up status tracking
        if batch_id in self.batch_status:
            del self.batch_status[batch_id]
        
        if batch_id in self.processing_threads:
            del self.processing_threads[batch_id]
        
        return True


# Convenience functions
def create_batch_processor(database_path, upload_folder):
    """Create a batch processor instance"""
    return BatchProcessor(database_path, upload_folder)
