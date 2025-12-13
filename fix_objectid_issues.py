#!/usr/bin/env python3
"""
Fix ObjectId issues in AeroLogix AI backend routes
Replace ObjectId() calls with direct string usage since aircraft IDs are strings
"""

import os
import re

def fix_file(filepath):
    """Fix ObjectId issues in a single file"""
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Fix ObjectId(aircraft_id) patterns
    content = re.sub(r'ObjectId\(([^)]+\.aircraft_id)\)', r'\1', content)
    content = re.sub(r'ObjectId\(aircraft_id\)', 'aircraft_id', content)
    content = re.sub(r'ObjectId\(record\.aircraft_id\)', 'record.aircraft_id', content)
    
    # Fix ObjectId(current_user.id) patterns
    content = re.sub(r'ObjectId\(current_user\.id\)', 'current_user.id', content)
    
    # Fix ObjectId(record_id) patterns for string IDs
    content = re.sub(r'ObjectId\(record_id\)', 'record_id', content)
    content = re.sub(r'ObjectId\(scan_id\)', 'scan_id', content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed ObjectId issues in {filepath}")
    else:
        print(f"No ObjectId issues found in {filepath}")

def main():
    """Fix ObjectId issues in all route files"""
    route_files = [
        '/app/backend/routes/ocr.py',
        '/app/backend/routes/maintenance.py',
        '/app/backend/routes/adsb.py',
        '/app/backend/routes/stc.py',
        '/app/backend/routes/parts.py'
    ]
    
    for filepath in route_files:
        fix_file(filepath)

if __name__ == '__main__':
    main()
