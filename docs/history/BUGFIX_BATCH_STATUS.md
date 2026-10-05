# 🔧 Bug Fix: Batch Processing Status Error

## Issue
Error 500 when fetching batch status:
```
AxiosError: Request failed with status code 500
BatchProcessing.jsx:136 Error fetching batch status
```

## Root Cause
The `get_batch_status` method in `batch_processor.py` was trying to access `status_counts[item_dict['status']]` without checking if the status value was valid. If a batch item had a `None` or unexpected status value, it would cause a `KeyError`.

## Fixes Applied

### 1. Fixed Status Counting (batch_processor.py)
**File**: `backend/batch_processor.py` (lines 132-141)

**Before**:
```python
for item in items:
    item_dict = dict(item)
    items_list.append(item_dict)
    status_counts[item_dict['status']] += 1  # ❌ KeyError if status is None
```

**After**:
```python
for item in items:
    item_dict = dict(item)
    items_list.append(item_dict)
    # Safely handle status - default to 'pending' if status is None or unexpected
    item_status = item_dict.get('status', 'pending')
    if item_status in status_counts:
        status_counts[item_status] += 1
    else:
        # If status is unexpected, count as pending
        status_counts['pending'] += 1
```

### 2. Added Better Error Logging (server.py)
**File**: `backend/server.py` (lines 1115-1137)

Added detailed logging and error reporting:
```python
@app.route('/api/batch/<int:batch_id>/status', methods=['GET'])
def get_batch_status_endpoint(batch_id):
    try:
        print(f"📊 Getting status for batch {batch_id}")  # Added logging
        bp = get_batch_processor()
        status = bp.get_batch_status(batch_id)
        
        if not status:
            print(f"❌ Batch {batch_id} not found")  # Added logging
            return jsonify({'error': 'Batch not found'}), 404
        
        print(f"✅ Batch {batch_id} status retrieved successfully")  # Added logging
        return jsonify(status)
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ Error getting batch status: {error_msg}")  # Added logging
        traceback.print_exc()  # Print full stack trace
        return jsonify({'error': error_msg, 'details': traceback.format_exc()}), 500
```

### 3. Added Batch Tables to init_db (server.py)
**File**: `backend/server.py` (lines 82-129)

Added automatic creation of batch tables on server startup:
```python
# Batch jobs table
cursor.execute('''CREATE TABLE IF NOT EXISTS batch_jobs (...)''')

# Batch items table
cursor.execute('''CREATE TABLE IF NOT EXISTS batch_items (...)''')

# Metadata suggestions table
cursor.execute('''CREATE TABLE IF NOT EXISTS metadata_suggestions (...)''')

# Create indexes
cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_items_batch_id ...')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_items_project_id ...')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_metadata_suggestions_project_id ...')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ...')
```

## How to Apply the Fix

### Step 1: Restart Backend Server
```bash
# In the terminal running the backend:
# Press Ctrl+C to stop the server

# Then restart:
cd backend
python server.py
```

### Step 2: Verify Tables Exist
The server will automatically create the batch tables on startup. You should see:
```
🚀 LibraDigit AI Backend Server
📊 Database initialized
🔍 Tesseract OCR: ✓ Available
🌐 Server running on http://localhost:5000
```

### Step 3: Test Batch Processing
1. Go to the Batch Processing page
2. Upload some files
3. Check the browser console - the error should be gone
4. Check the backend terminal - you should see status logs like:
   ```
   📊 Getting status for batch 1
   ✅ Batch 1 status retrieved successfully
   ```

## Prevention
These fixes ensure:
- ✅ **Safe status handling** - No more KeyError on unexpected status values
- ✅ **Better error logging** - Easier to debug future issues
- ✅ **Automatic table creation** - Tables are created on server startup
- ✅ **Detailed error messages** - Full stack traces for debugging

## Testing Checklist
- [x] Fixed status counting logic
- [x] Added error logging
- [x] Added batch tables to init_db
- [ ] Restart backend server
- [ ] Test batch upload
- [ ] Verify status polling works
- [ ] Check backend logs for errors

## Related Files Modified
1. `backend/batch_processor.py` - Fixed status counting
2. `backend/server.py` - Added logging and table creation

## Status
✅ **FIXED** - Ready to test after backend restart

---

**Date**: January 25, 2026  
**Issue**: Batch status 500 error  
**Severity**: Medium  
**Resolution Time**: 5 minutes
