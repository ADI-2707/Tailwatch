import unittest
from tailwatch.core.security import hash_password, verify_password, generate_session_token, hash_session_token

class TestSecurity(unittest.TestCase):
    def test_password_hashing_and_verification(self):
        password = "super-secret-admin-pass"
        pwd_hash = hash_password(password)
        self.assertNotEqual(password, pwd_hash)
        self.assertTrue(verify_password(password, pwd_hash))
        self.assertFalse(verify_password("wrong-password", pwd_hash))

    def test_session_token_hashing(self):
        token = generate_session_token()
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 30)
        h1 = hash_session_token(token)
        h2 = hash_session_token(token)
        self.assertEqual(h1, h2)
        self.assertNotEqual(token, h1)

if __name__ == "__main__":
    unittest.main()

