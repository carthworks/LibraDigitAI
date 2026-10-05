"""
Database Diagnostic Script
Checks the database structure and batch data
"""

import os
import sqlite3
import json

DATABASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'libradigit.db')

def check_database():
    """Check database structure and data"""
    print("🔍 Checking LibraDigit AI Database...")
    print("=" * 60)
    
    try:
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check tables
        print("\n📋 Tables in database:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        for table in tables:
            print(f"  ✓ {table['name']}")
        
        # Check batch_jobs
        print("\n📦 Batch Jobs:")
        cursor.execute("SELECT * FROM batch_jobs")
        batches = cursor.fetchall()
        if batches:
            for batch in batches:
                print(f"  Batch ID: {batch['id']}")
                print(f"    Name: {batch['name']}")
                print(f"    Status: {batch['status']}")
                print(f"    Total Files: {batch['total_files']}")
                print(f"    Processed: {batch['processed_files']}")
                print(f"    Created: {batch['created_at']}")
                print()
        else:
            print("  No batches found")
        
        # Check batch_items
        print("\n📄 Batch Items:")
        cursor.execute("SELECT * FROM batch_items")
        items = cursor.fetchall()
        if items:
            for item in items:
                print(f"  Item ID: {item['id']}")
                print(f"    Batch ID: {item['batch_id']}")
                print(f"    Project ID: {item['project_id']}")
                print(f"    Status: {item['status']}")
                if item['error_message']:
                    print(f"    Error: {item['error_message']}")
                print()
        else:
            print("  No batch items found")
        
        # Check projects
        print("\n📁 Projects:")
        cursor.execute("SELECT id, filename, status FROM projects")
        projects = cursor.fetchall()
        if projects:
            for project in projects:
                print(f"  Project ID: {project['id']}")
                print(f"    Filename: {project['filename']}")
                print(f"    Status: {project['status']}")
                print()
        else:
            print("  No projects found")
        
        # Check for orphaned batch items (items with missing projects)
        print("\n⚠️  Checking for orphaned batch items...")
        cursor.execute('''
            SELECT bi.id, bi.batch_id, bi.project_id
            FROM batch_items bi
            LEFT JOIN projects p ON bi.project_id = p.id
            WHERE p.id IS NULL
        ''')
        orphaned = cursor.fetchall()
        if orphaned:
            print(f"  Found {len(orphaned)} orphaned batch items:")
            for item in orphaned:
                print(f"    Item ID: {item['id']}, Batch ID: {item['batch_id']}, Project ID: {item['project_id']}")
        else:
            print("  ✓ No orphaned batch items")
        
        # Test batch status query
        print("\n🧪 Testing batch status query...")
        cursor.execute("SELECT id FROM batch_jobs LIMIT 1")
        batch = cursor.fetchone()
        if batch:
            batch_id = batch['id']
            print(f"  Testing with batch ID: {batch_id}")
            
            try:
                cursor.execute('''
                    SELECT bi.*, COALESCE(p.filename, 'Unknown') as filename
                    FROM batch_items bi
                    LEFT JOIN projects p ON bi.project_id = p.id
                    WHERE bi.batch_id = ?
                    ORDER BY bi.id
                ''', (batch_id,))
                items = cursor.fetchall()
                print(f"  ✓ Query successful, found {len(items)} items")
                for item in items:
                    item_dict = dict(item)
                    print(f"    - {item_dict.get('filename')}: {item_dict.get('status')}")
            except Exception as e:
                print(f"  ✗ Query failed: {e}")
        else:
            print("  No batches to test with")
        
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ Database check complete!")
        
    except Exception as e:
        print(f"\n❌ Error checking database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_database()
