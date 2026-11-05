import unittest
from datetime import datetime, timezone
from tailwatch.query.compiler import QueryCompiler

class TestQueryFacetsAndFilters(unittest.TestCase):
    def test_single_service_filter(self):
        compiler = QueryCompiler("service:shop-payment")
        sql, params = compiler.compile()
        self.assertIn("service = $", sql)
        self.assertEqual(params, ["shop-payment"])

    def test_single_level_filter(self):
        compiler = QueryCompiler("level:error")
        sql, params = compiler.compile()
        self.assertIn("level = $", sql)
        self.assertEqual(params, [50])

    def test_multiple_levels_and_free_text(self):
        compiler = QueryCompiler('level:warn "database connection timeout"')
        sql, params = compiler.compile()
        self.assertIn("level = $", sql)
        self.assertIn("message ILIKE $", sql)
        self.assertEqual(len(params), 2)

    def test_compound_service_and_level_filter(self):
        compiler = QueryCompiler('service:shop-auth level:error "jwt expired"')
        sql, params = compiler.compile()
        self.assertIn("service = $", sql)
        self.assertIn("level = $", sql)
        self.assertIn("message ILIKE $", sql)
        self.assertEqual(len(params), 3)

    def test_custom_attributes_in_compound_query(self):
        compiler = QueryCompiler('service:shop-payment status_code:500 level:error')
        sql, params = compiler.compile()
        self.assertIn("service = $", sql)
        self.assertIn("fields->>'status_code' = $", sql)
        self.assertIn("level = $", sql)
        self.assertEqual(len(params), 3)

