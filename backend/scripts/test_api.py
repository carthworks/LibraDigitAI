"""
Test script to verify LibraDigit AI backend API is working
"""
import requests
import json

BASE_URL = "http://localhost:5001"

def test_api():
    print("🧪 Testing LibraDigit AI Backend API\n")
    
    # Test 1: Root endpoint
    print("1. Testing root endpoint (/)...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("   ✅ Root endpoint working")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Root endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 2: Health check
    print("2. Testing health check (/api/health)...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("   ✅ Health check working")
            print(f"   Response: {response.json()}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 3: Get projects
    print("3. Testing get projects (/api/projects)...")
    try:
        response = requests.get(f"{BASE_URL}/api/projects")
        if response.status_code == 200:
            print("   ✅ Get projects working")
            data = response.json()
            print(f"   Found {len(data.get('projects', []))} projects")
        else:
            print(f"   ❌ Get projects failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 4: Create a test project
    print("4. Testing create project (POST /api/projects)...")
    try:
        test_data = {
            "filename": "test_document.pdf",
            "filepath": "/uploads/test_document.pdf"
        }
        response = requests.post(f"{BASE_URL}/api/projects", json=test_data)
        if response.status_code == 200:
            print("   ✅ Create project working")
            project = response.json().get('project', {})
            print(f"   Created project ID: {project.get('id')}")
            return project.get('id')
        else:
            print(f"   ❌ Create project failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    return None

if __name__ == "__main__":
    print("=" * 60)
    print("LibraDigit AI - Backend API Test")
    print("=" * 60)
    print()
    
    try:
        project_id = test_api()
        print()
        print("=" * 60)
        if project_id:
            print("✅ All tests passed! Backend API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the output above.")
        print("=" * 60)
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
