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

    def test_phrase_search(self):
        compiler = QueryCompiler('"connection timeout"')
        sql, params = compiler.compile()
        self.assertEqual(sql, "message ILIKE $1")
        self.assertEqual(params, ["%connection timeout%"])

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

    def test_level_comparison_operator(self):
        compiler = QueryCompiler("level:>=warn")
        sql, params = compiler.compile()
        self.assertEqual(sql, "level >= $1")
        self.assertEqual(params, [40])

    def test_custom_field_filter(self):
        compiler = QueryCompiler("status_code:500")
        sql, params = compiler.compile()
        self.assertEqual(sql, "fields->>'status_code' = $1")
        self.assertEqual(params, ["500"])

    def test_fields_prefix_and_equals_operator(self):
        compiler = QueryCompiler('fields.event_id="abc-123"')
        sql, params = compiler.compile()
        self.assertEqual(sql, "fields->>'event_id' = $1")
        self.assertEqual(params, ["abc-123"])

    def test_compound_query(self):
        compiler = QueryCompiler("service:web level:error fields.status=500")
        sql, params = compiler.compile()
        self.assertEqual(sql, "service = $1 AND level = $2 AND fields->>'status' = $3")
        self.assertEqual(params, ["web", 50, "500"])

    def test_negation(self):
        compiler = QueryCompiler("NOT service:auth")
        sql, params = compiler.compile()
        self.assertEqual(sql, "NOT (service = $1)")
        self.assertEqual(params, ["auth"])

if __name__ == "__main__":
    unittest.main()
