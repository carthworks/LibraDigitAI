"""
Test script to verify text file detection and handling
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from server import is_text_file, extract_text_from_text_file

def test_file_detection():
    """Test the file detection functionality"""
    
    print("🧪 Testing Text File Detection\n")
    print("="*60)
    
    # Test files
    test_files = [
        "Archive/  WEBSITE PACKAGE/2025/Latha_2025_Veterinary Clinic.pdf",
    ]
    
    for filepath in test_files:
        if os.path.exists(filepath):
            print(f"\n📄 Testing: {filepath}")
            print(f"   File size: {os.path.getsize(filepath)} bytes")
            
            is_text = is_text_file(filepath)
            print(f"   Is text file: {is_text}")
            
            if is_text:
                print("   ⚠️  WARNING: This is a text file with .pdf extension")
                print("   💡 Run: python convert_text_to_pdf.py \"{}\"".format(filepath))
            else:
                print("   ✓ This is a valid PDF file")
        else:
            print(f"\n❌ File not found: {filepath}")
    
    print("\n" + "="*60)
    print("✅ Test completed!\n")

if __name__ == '__main__':
    test_file_detection()
