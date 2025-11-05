#!/usr/bin/env python3
"""
IEEE Club Hackathon Website Backend API Testing
Tests all CRUD operations for events, participants, and contact form
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://eventflow-88.preview.emergentagent.com/api"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

class BackendTester:
    def __init__(self):
        self.test_results = []
        self.created_event_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_health_check(self):
        """Test API health check"""
        try:
            response = requests.get(f"{BASE_URL}/", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "IEEE Club API" in data.get("message", ""):
                    self.log_test("API Health Check", True, "API is responding correctly")
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_create_event(self):
        """Test POST /api/events - Create new event"""
        try:
            # Create test event with future date
            future_date = (datetime.now() + timedelta(days=30)).isoformat()
            
            event_data = {
                "title": "Test Hackathon 2025",
                "description": "24-hour coding marathon for testing purposes",
                "event_date": future_date,
                "is_active": True,
                "registration_open": True,
                "banner_url": "https://example.com/banner.jpg",
                "form_fields": []
            }
            
            response = requests.post(f"{BASE_URL}/events", json=event_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "event" in data:
                    self.created_event_id = data["event"]["id"]
                    self.log_test("Create Event", True, f"Event created with ID: {self.created_event_id}")
                    return True
                else:
                    self.log_test("Create Event", False, "Success=false or missing event data", data)
                    return False
            else:
                self.log_test("Create Event", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Event", False, f"Error: {str(e)}")
            return False

    def test_get_all_events(self):
        """Test GET /api/events - Get all events"""
        try:
            response = requests.get(f"{BASE_URL}/events", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "events" in data:
                    events_count = len(data["events"])
                    self.log_test("Get All Events", True, f"Retrieved {events_count} events")
                    return True
                else:
                    self.log_test("Get All Events", False, "Success=false or missing events data", data)
                    return False
            else:
                self.log_test("Get All Events", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get All Events", False, f"Error: {str(e)}")
            return False

    def test_get_active_events(self):
        """Test GET /api/events?active=true - Filter by active events"""
        try:
            response = requests.get(f"{BASE_URL}/events?active=true", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "events" in data:
                    active_events = [e for e in data["events"] if e.get("is_active")]
                    self.log_test("Get Active Events", True, f"Retrieved {len(active_events)} active events")
                    return True
                else:
                    self.log_test("Get Active Events", False, "Success=false or missing events data", data)
                    return False
            else:
                self.log_test("Get Active Events", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Active Events", False, f"Error: {str(e)}")
            return False

    def test_get_events_with_limit(self):
        """Test GET /api/events?limit=5 - Test pagination"""
        try:
            response = requests.get(f"{BASE_URL}/events?limit=5", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "events" in data:
                    events_count = len(data["events"])
                    self.log_test("Get Events with Limit", True, f"Retrieved {events_count} events (max 5)")
                    return True
                else:
                    self.log_test("Get Events with Limit", False, "Success=false or missing events data", data)
                    return False
            else:
                self.log_test("Get Events with Limit", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Events with Limit", False, f"Error: {str(e)}")
            return False

    def test_get_single_event(self):
        """Test GET /api/events/:id - Get single event by ID"""
        if not self.created_event_id:
            self.log_test("Get Single Event", False, "No event ID available (create event test failed)")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/events/{self.created_event_id}", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "event" in data:
                    event = data["event"]
                    if event["id"] == self.created_event_id:
                        self.log_test("Get Single Event", True, f"Retrieved event: {event['title']}")
                        return True
                    else:
                        self.log_test("Get Single Event", False, "Event ID mismatch", data)
                        return False
                else:
                    self.log_test("Get Single Event", False, "Success=false or missing event data", data)
                    return False
            else:
                self.log_test("Get Single Event", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Single Event", False, f"Error: {str(e)}")
            return False

    def test_update_event(self):
        """Test PUT /api/events/:id - Update event"""
        if not self.created_event_id:
            self.log_test("Update Event", False, "No event ID available (create event test failed)")
            return False
            
        try:
            update_data = {
                "title": "Updated Hackathon 2025",
                "description": "Updated 24-hour coding marathon with new features",
                "form_fields": [
                    {"id": "field-1", "type": "text", "label": "Team Name", "required": True},
                    {"id": "field-2", "type": "email", "label": "Email", "required": True},
                    {"id": "field-3", "type": "number", "label": "Team Size", "required": False}
                ]
            }
            
            response = requests.put(f"{BASE_URL}/events/{self.created_event_id}", json=update_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "event" in data:
                    event = data["event"]
                    if event["title"] == "Updated Hackathon 2025" and len(event["form_fields"]) == 3:
                        self.log_test("Update Event", True, "Event updated successfully with form fields")
                        return True
                    else:
                        self.log_test("Update Event", False, "Update data not reflected correctly", data)
                        return False
                else:
                    self.log_test("Update Event", False, "Success=false or missing event data", data)
                    return False
            else:
                self.log_test("Update Event", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Update Event", False, f"Error: {str(e)}")
            return False

    def test_create_participant(self):
        """Test POST /api/participants - Register a participant"""
        if not self.created_event_id:
            self.log_test("Create Participant", False, "No event ID available (create event test failed)")
            return False
            
        try:
            participant_data = {
                "event_id": self.created_event_id,
                "responses": {
                    "Team Name": "Tech Innovators",
                    "Email": "test@example.com",
                    "Team Size": 4
                }
            }
            
            response = requests.post(f"{BASE_URL}/participants", json=participant_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "participant" in data:
                    participant = data["participant"]
                    if participant["event_id"] == self.created_event_id:
                        self.log_test("Create Participant", True, "Participant registered successfully")
                        return True
                    else:
                        self.log_test("Create Participant", False, "Event ID mismatch in participant", data)
                        return False
                else:
                    self.log_test("Create Participant", False, "Success=false or missing participant data", data)
                    return False
            else:
                self.log_test("Create Participant", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Create Participant", False, f"Error: {str(e)}")
            return False

    def test_get_participants_for_event(self):
        """Test GET /api/participants/:eventId - Get participants for an event"""
        if not self.created_event_id:
            self.log_test("Get Participants for Event", False, "No event ID available (create event test failed)")
            return False
            
        try:
            response = requests.get(f"{BASE_URL}/participants/{self.created_event_id}", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "participants" in data:
                    participants_count = len(data["participants"])
                    self.log_test("Get Participants for Event", True, f"Retrieved {participants_count} participants for event")
                    return True
                else:
                    self.log_test("Get Participants for Event", False, "Success=false or missing participants data", data)
                    return False
            else:
                self.log_test("Get Participants for Event", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Participants for Event", False, f"Error: {str(e)}")
            return False

    def test_get_participant_count(self):
        """Test GET /api/participants/count - Get total participant count"""
        try:
            response = requests.get(f"{BASE_URL}/participants/count", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "count" in data:
                    count = data["count"]
                    self.log_test("Get Participant Count", True, f"Total participants: {count}")
                    return True
                else:
                    self.log_test("Get Participant Count", False, "Success=false or missing count data", data)
                    return False
            else:
                self.log_test("Get Participant Count", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Participant Count", False, f"Error: {str(e)}")
            return False

    def test_contact_form_submission(self):
        """Test POST /api/contact - Submit contact form"""
        try:
            contact_data = {
                "name": "John Doe",
                "email": "john@example.com",
                "message": "Test message for IEEE Club hackathon inquiry"
            }
            
            response = requests.post(f"{BASE_URL}/contact", json=contact_data, headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "submission" in data:
                    submission = data["submission"]
                    if submission["name"] == "John Doe" and submission["email"] == "john@example.com":
                        self.log_test("Contact Form Submission", True, "Contact form submitted successfully")
                        return True
                    else:
                        self.log_test("Contact Form Submission", False, "Submission data mismatch", data)
                        return False
                else:
                    self.log_test("Contact Form Submission", False, "Success=false or missing submission data", data)
                    return False
            else:
                self.log_test("Contact Form Submission", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Contact Form Submission", False, f"Error: {str(e)}")
            return False

    def test_error_handling(self):
        """Test error handling scenarios"""
        error_tests_passed = 0
        total_error_tests = 3
        
        # Test 1: Get non-existent event
        try:
            response = requests.get(f"{BASE_URL}/events/non-existent-id", headers=HEADERS, timeout=10)
            if response.status_code == 404:
                error_tests_passed += 1
                print("✅ Non-existent event returns 404")
            else:
                print(f"❌ Non-existent event returned {response.status_code} instead of 404")
        except Exception as e:
            print(f"❌ Error testing non-existent event: {e}")
        
        # Test 2: Create event with missing required fields
        try:
            invalid_event = {"description": "Missing title"}
            response = requests.post(f"{BASE_URL}/events", json=invalid_event, headers=HEADERS, timeout=10)
            if response.status_code in [400, 500]:  # Either is acceptable for validation error
                error_tests_passed += 1
                print("✅ Invalid event data handled properly")
            else:
                print(f"❌ Invalid event data returned {response.status_code}")
        except Exception as e:
            print(f"❌ Error testing invalid event: {e}")
        
        # Test 3: Register participant for non-existent event
        try:
            invalid_participant = {
                "event_id": "non-existent-event-id",
                "responses": {"name": "Test"}
            }
            response = requests.post(f"{BASE_URL}/participants", json=invalid_participant, headers=HEADERS, timeout=10)
            if response.status_code in [400, 404, 500]:  # Any error status is acceptable
                error_tests_passed += 1
                print("✅ Invalid participant registration handled properly")
            else:
                print(f"❌ Invalid participant registration returned {response.status_code}")
        except Exception as e:
            print(f"❌ Error testing invalid participant: {e}")
        
        success = error_tests_passed == total_error_tests
        self.log_test("Error Handling Tests", success, f"{error_tests_passed}/{total_error_tests} error scenarios handled correctly")
        return success

    def test_delete_event(self):
        """Test DELETE /api/events/:id - Delete event (cleanup)"""
        if not self.created_event_id:
            self.log_test("Delete Event", False, "No event ID available (create event test failed)")
            return False
            
        try:
            response = requests.delete(f"{BASE_URL}/events/{self.created_event_id}", headers=HEADERS, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_test("Delete Event", True, "Event deleted successfully")
                    return True
                else:
                    self.log_test("Delete Event", False, "Success=false in delete response", data)
                    return False
            else:
                self.log_test("Delete Event", False, f"Status: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Delete Event", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 60)
        print("IEEE CLUB HACKATHON WEBSITE - BACKEND API TESTING")
        print("=" * 60)
        print()
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_create_event,
            self.test_get_all_events,
            self.test_get_active_events,
            self.test_get_events_with_limit,
            self.test_get_single_event,
            self.test_update_event,
            self.test_create_participant,
            self.test_get_participants_for_event,
            self.test_get_participant_count,
            self.test_contact_form_submission,
            self.test_error_handling,
            self.test_delete_event
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        print()
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
            
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)