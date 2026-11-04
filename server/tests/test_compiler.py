import unittest
from tailwatch.query.compiler import QueryCompiler

class TestQueryCompiler(unittest.TestCase):
    def test_empty_query(self):
        compiler = QueryCompiler("")
        sql, params = compiler.compile()
        self.assertEqual(sql, "1=1")
        self.assertEqual(params, [])

    def test_full_text_search(self):
        compiler = QueryCompiler("timeout connecting")
        sql, params = compiler.compile()
        self.assertEqual(sql, "message ILIKE $1 AND message ILIKE $2")
        self.assertEqual(params, ["%timeout%", "%connecting%"])

    def test_service_filter(self):
        compiler = QueryCompiler("service:shop-payment")
        sql, params = compiler.compile()
        self.assertEqual(sql, "service = $1")
        self.assertEqual(params, ["shop-payment"])

    def test_level_name_and_operator(self):
        compiler = QueryCompiler("level:error")
        sql, params = compiler.compile()
        self.assertEqual(sql, "level = $1")
        self.assertEqual(params, [50])

    def test_custom_field_filter(self):
        compiler = QueryCompiler("status_code:500")
        sql, params = compiler.compile()
        self.assertEqual(sql, "fields->>'status_code' = $1")
        self.assertEqual(params, ["500"])

    def test_negation(self):
        compiler = QueryCompiler("NOT service:auth")
        sql, params = compiler.compile()
        self.assertEqual(sql, "NOT (service = $1)")
        self.assertEqual(params, ["auth"])

if __name__ == "__main__":
    unittest.main()
