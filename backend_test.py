#!/usr/bin/env python3
"""
AeroLogix AI Backend API Testing
Tests OCR and related endpoints for the AeroLogix AI application
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://appstore-build-audit.preview.emergentagent.com"
TEST_EMAIL = "test@aerologix.com"
TEST_PASSWORD = "password123"

class AeroLogixAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {"Content-Type": "application/json"}
        self.aircraft_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def test_login(self) -> bool:
        """Test user login and get JWT token"""
        print("\n=== Testing Authentication ===")
        
        # Test login
        login_data = {
            "username": TEST_EMAIL,  # FastAPI OAuth2PasswordRequestForm uses 'username' field
            "password": TEST_PASSWORD
        }
        
        # Use form data for OAuth2PasswordRequestForm
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                data=login_data,  # Use data instead of json for form data
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                response_data = response.json()
                self.token = response_data.get("access_token")
                if self.token:
                    self.headers["Authorization"] = f"Bearer {self.token}"
                    self.log_test("User Login", True, f"Token received: {self.token[:20]}...")
                    return True
                else:
                    self.log_test("User Login", False, "No access token in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    self.log_test("User Login", False, f"Status {response.status_code}: {error_data}")
                except:
                    self.log_test("User Login", False, f"Status {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("User Login", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_user_info(self) -> bool:
        """Test getting current user info"""
        success, data, status = self.make_request("GET", "/api/auth/me")
        self.log_test("Get User Info", success, f"User: {data.get('email', 'N/A')}" if success else str(data))
        return success
    
    def test_aircraft_operations(self) -> bool:
        """Test aircraft operations - get existing or create new"""
        print("\n=== Testing Aircraft Operations ===")
        
        # Get existing aircraft
        success, data, status = self.make_request("GET", "/api/aircraft")
        
        if success and data and len(data) > 0:
            self.aircraft_id = data[0]["_id"]
            self.log_test("Get Aircraft List", True, f"Found {len(data)} aircraft, using ID: {self.aircraft_id}")
            return True
        
        # Create new aircraft if none exist
        aircraft_data = {
            "registration": "C-TEST",
            "aircraft_type": "AIRPLANE",
            "manufacturer": "Cessna",
            "model": "172",
            "year": 2020,
            "serial_number": "TEST123",
            "airframe_hours": 1500.5,
            "engine_hours": 1200.0,
            "propeller_hours": 1200.0,
            "description": "Test aircraft for API testing"
        }
        
        success, data, status = self.make_request("POST", "/api/aircraft", aircraft_data)
        
        if success:
            self.aircraft_id = data.get("_id")
            self.log_test("Create Aircraft", True, f"Created aircraft with ID: {self.aircraft_id}")
            return True
        else:
            self.log_test("Create Aircraft", False, str(data))
            return False
    
    def test_ocr_quota_status(self) -> bool:
        """Test OCR quota status endpoint"""
        print("\n=== Testing OCR Endpoints ===")
        
        success, data, status = self.make_request("GET", "/api/ocr/quota/status")
        
        if success:
            used = data.get("used", "N/A")
            limit = data.get("limit", "N/A")
            remaining = data.get("remaining", "N/A")
            self.log_test("OCR Quota Status", True, f"Used: {used}, Limit: {limit}, Remaining: {remaining}")
        else:
            self.log_test("OCR Quota Status", False, str(data))
        
        return success
    
    def test_ocr_history(self) -> bool:
        """Test OCR history endpoint"""
        if not self.aircraft_id:
            self.log_test("OCR History", False, "No aircraft ID available")
            return False
        
        success, data, status = self.make_request("GET", f"/api/ocr/history/{self.aircraft_id}")
        
        if success:
            self.log_test("OCR History", True, f"Retrieved {len(data)} OCR scans")
        else:
            self.log_test("OCR History", False, str(data))
        
        return success
    
    def test_maintenance_operations(self) -> bool:
        """Test maintenance record operations"""
        print("\n=== Testing Maintenance Endpoints ===")
        
        if not self.aircraft_id:
            self.log_test("Maintenance Operations", False, "No aircraft ID available")
            return False
        
        # Create maintenance record
        maintenance_data = {
            "aircraft_id": self.aircraft_id,
            "maintenance_type": "ROUTINE",
            "date": datetime.now().isoformat(),
            "description": "Test maintenance record - 100 hour inspection",
            "ame_name": "John Smith",
            "amo_name": "Test Aviation Maintenance",
            "ame_license": "AME12345",
            "work_order_number": "WO-2024-001",
            "airframe_hours": 1600.0,
            "engine_hours": 1300.0,
            "propeller_hours": 1300.0,
            "remarks": "All systems checked and operational",
            "labor_cost": 500.00,
            "parts_cost": 150.00,
            "total_cost": 650.00,
            "parts_replaced": ["spark_plug_1", "oil_filter"],
            "regulatory_references": ["AD-2024-001"]
        }
        
        success, data, status = self.make_request("POST", "/api/maintenance", maintenance_data)
        
        if success:
            maintenance_id = data.get("id")
            self.log_test("Create Maintenance Record", True, f"Created maintenance record: {maintenance_id}")
            
            # Test getting maintenance records
            success2, data2, status2 = self.make_request("GET", f"/api/maintenance/{self.aircraft_id}")
            
            if success2:
                self.log_test("Get Maintenance Records", True, f"Retrieved {len(data2)} maintenance records")
                return True
            else:
                self.log_test("Get Maintenance Records", False, str(data2))
                return False
        else:
            self.log_test("Create Maintenance Record", False, str(data))
            return False
    
    def test_adsb_operations(self) -> bool:
        """Test AD/SB record operations"""
        print("\n=== Testing AD/SB Endpoints ===")
        
        if not self.aircraft_id:
            self.log_test("AD/SB Operations", False, "No aircraft ID available")
            return False
        
        # Create AD/SB record
        adsb_data = {
            "aircraft_id": self.aircraft_id,
            "adsb_type": "AD",
            "reference_number": "AD-2024-TEST-001",
            "title": "Test Airworthiness Directive",
            "description": "Test AD for API testing - Engine inspection required",
            "status": "COMPLIED",
            "compliance_date": datetime.now().isoformat(),
            "compliance_airframe_hours": 1600.0,
            "compliance_engine_hours": 1300.0,
            "compliance_propeller_hours": 1300.0
        }
        
        success, data, status = self.make_request("POST", "/api/adsb", adsb_data)
        
        if success:
            adsb_id = data.get("id")
            self.log_test("Create AD/SB Record", True, f"Created AD/SB record: {adsb_id}")
            
            # Test getting AD/SB records
            success2, data2, status2 = self.make_request("GET", f"/api/adsb/{self.aircraft_id}")
            
            if success2:
                self.log_test("Get AD/SB Records", True, f"Retrieved {len(data2)} AD/SB records")
                
                # Test AD/SB summary
                success3, data3, status3 = self.make_request("GET", f"/api/adsb/{self.aircraft_id}/summary")
                
                if success3:
                    self.log_test("Get AD/SB Summary", True, f"Summary: {data3}")
                    return True
                else:
                    self.log_test("Get AD/SB Summary", False, str(data3))
                    return False
            else:
                self.log_test("Get AD/SB Records", False, str(data2))
                return False
        else:
            self.log_test("Create AD/SB Record", False, str(data))
            return False
    
    def test_stc_operations(self) -> bool:
        """Test STC record operations"""
        print("\n=== Testing STC Endpoints ===")
        
        if not self.aircraft_id:
            self.log_test("STC Operations", False, "No aircraft ID available")
            return False
        
        # Create STC record
        stc_data = {
            "aircraft_id": self.aircraft_id,
            "stc_number": "STC-TEST-2024-001",
            "title": "Test Supplemental Type Certificate",
            "description": "Test STC for API testing - GPS navigation system",
            "holder": "Test Avionics Inc.",
            "applicable_models": ["Cessna 172", "Cessna 182"],
            "installation_date": datetime.now().isoformat(),
            "installation_airframe_hours": 1600.0,
            "installed_by": "John Smith AME"
        }
        
        success, data, status = self.make_request("POST", "/api/stc", stc_data)
        
        if success:
            stc_id = data.get("id")
            self.log_test("Create STC Record", True, f"Created STC record: {stc_id}")
            
            # Test getting STC records
            success2, data2, status2 = self.make_request("GET", f"/api/stc/{self.aircraft_id}")
            
            if success2:
                self.log_test("Get STC Records", True, f"Retrieved {len(data2)} STC records")
                return True
            else:
                self.log_test("Get STC Records", False, str(data2))
                return False
        else:
            self.log_test("Create STC Record", False, str(data))
            return False
    
    def test_parts_operations(self) -> bool:
        """Test parts record operations"""
        print("\n=== Testing Parts Endpoints ===")
        
        if not self.aircraft_id:
            self.log_test("Parts Operations", False, "No aircraft ID available")
            return False
        
        # Create part record
        part_data = {
            "aircraft_id": self.aircraft_id,
            "part_number": "NGK-BPR6ES",
            "name": "Spark Plug",
            "serial_number": "SP123456",
            "quantity": 4,
            "purchase_price": 25.99,
            "supplier": "Aircraft Spruce",
            "installation_date": datetime.now().isoformat(),
            "installation_airframe_hours": 1600.0,
            "installed_on_aircraft": True
        }
        
        success, data, status = self.make_request("POST", "/api/parts", part_data)
        
        if success:
            part_id = data.get("id")
            self.log_test("Create Part Record", True, f"Created part record: {part_id}")
            
            # Test getting aircraft parts
            success2, data2, status2 = self.make_request("GET", f"/api/parts/aircraft/{self.aircraft_id}")
            
            if success2:
                self.log_test("Get Aircraft Parts", True, f"Retrieved {len(data2)} parts")
                
                # Test getting inventory parts
                success3, data3, status3 = self.make_request("GET", "/api/parts/inventory")
                
                if success3:
                    self.log_test("Get Inventory Parts", True, f"Retrieved {len(data3)} inventory parts")
                    return True
                else:
                    self.log_test("Get Inventory Parts", False, str(data3))
                    return False
            else:
                self.log_test("Get Aircraft Parts", False, str(data2))
                return False
        else:
            self.log_test("Create Part Record", False, str(data))
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AeroLogix AI Backend API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_EMAIL}")
        
        # Authentication is required for all other tests
        if not self.test_login():
            print("\n❌ Authentication failed - cannot proceed with other tests")
            return False
        
        # Test user info
        self.test_get_user_info()
        
        # Aircraft operations (required for other tests)
        if not self.test_aircraft_operations():
            print("\n❌ Aircraft operations failed - cannot test other endpoints")
            return False
        
        # Test all endpoints
        self.test_ocr_quota_status()
        self.test_ocr_history()
        self.test_maintenance_operations()
        self.test_adsb_operations()
        self.test_stc_operations()
        self.test_parts_operations()
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        print("\n" + "="*60)

def main():
    """Main function"""
    tester = AeroLogixAPITester()
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()