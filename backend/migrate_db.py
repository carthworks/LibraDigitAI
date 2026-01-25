"""
Database Migration Script
Adds tables for batch processing and metadata suggestions
"""

import sqlite3
import os

DATABASE = 'libradigit.db'

def migrate_database():
    """Add new tables for batch processing and AI metadata"""
    
    print("🔄 Starting database migration...")
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        # Create batch_jobs table
        print("📊 Creating batch_jobs table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS batch_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                total_files INTEGER DEFAULT 0,
                processed_files INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        ''')
        
        # Create batch_items table
        print("📊 Creating batch_items table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS batch_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL,
                project_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES batch_jobs(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        ''')
        
        # Create metadata_suggestions table
        print("📊 Creating metadata_suggestions table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metadata_suggestions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                suggested_title TEXT,
                suggested_author TEXT,
                suggested_year TEXT,
                suggested_subject TEXT,
                suggested_keywords TEXT,
                confidence_scores TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes for better performance
        print("🔍 Creating indexes...")
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id 
            ON batch_items(batch_id)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_batch_items_project_id 
            ON batch_items(project_id)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_project_id 
            ON metadata_suggestions(project_id)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_batch_jobs_status 
            ON batch_jobs(status)
        ''')
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Show table info
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"\n📋 Current tables: {', '.join([t[0] for t in tables])}")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        raise
    
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()
