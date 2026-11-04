from typing import List, Tuple, Any
from tailwatch.query.lexer import Lexer, Token, TokenType

LEVEL_NAME_MAP = {
    "trace": 10,
    "debug": 20,
    "info": 30,
    "warn": 40,
    "warning": 40,
    "error": 50,
    "fatal": 60,
}

class QueryCompiler:
    def __init__(self, query_str: str):
        self.lexer = Lexer(query_str)
        self.tokens = self.lexer.tokenize()
        self.pos = 0
        self.params: List[Any] = []

    def _current(self) -> Token:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return self.tokens[-1]

    def _advance(self) -> Token:
        t = self._current()
        self.pos += 1
        return t

    def compile(self) -> Tuple[str, List[Any]]:
        conditions: List[str] = []

        while self._current().type != TokenType.EOF:
            tok = self._current()

            if tok.type == TokenType.NOT:
                self._advance()
                sub_sql = self._parse_term()
                if sub_sql:
                    conditions.append(f"NOT ({sub_sql})")
            elif tok.type in (TokenType.WORD, TokenType.PHRASE):
                sql_part = self._parse_term()
                if sql_part:
                    conditions.append(sql_part)
            else:
                self._advance()

        if not conditions:
            return "1=1", []

        return " AND ".join(conditions), self.params

    def _parse_term(self) -> str:
        tok = self._advance()

        if self._current().type == TokenType.COLON:
            colon_tok = self._advance()
            if self._current().type in (TokenType.NOT_EQUAL, TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL, TokenType.TILDE):
                op_tok = self._advance()
            else:
                op_tok = colon_tok
            val_tok = self._advance()

            field_name = tok.value.lower()
            val = val_tok.value
            return self._build_field_clause(field_name, op_tok.value, val)

        if self._current().type in (TokenType.NOT_EQUAL, TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL, TokenType.TILDE):
            op_tok = self._advance()
            val_tok = self._advance()

            field_name = tok.value.lower()
            val = val_tok.value
            return self._build_field_clause(field_name, op_tok.value, val)

        self.params.append(f"%{tok.value}%")
        return f"message ILIKE ${len(self.params)}"

    def _build_field_clause(self, field: str, op: str, value: str) -> str:
        sql_op = op
        if op == ":":
            sql_op = "="

        if field.startswith("fields."):
            field = field[7:]

        if field == "service":
            self.params.append(value)
            return f"service {sql_op} ${len(self.params)}"

        if field == "host":
            self.params.append(value)
            return f"host {sql_op} ${len(self.params)}"

        if field == "level":
            num_val = LEVEL_NAME_MAP.get(value.lower())
            if num_val is None:
                try:
                    num_val = int(value)
                except ValueError:
                    num_val = 30
            self.params.append(num_val)
            return f"level {sql_op} ${len(self.params)}"

        if field == "trace_id":
            self.params.append(value)
            return f"trace_id {sql_op} ${len(self.params)}"

        if op == "~":
            self.params.append(f"%{value}%")
            return f"fields->>'{field}' ILIKE ${len(self.params)}"

        self.params.append(value)
        return f"fields->>'{field}' {sql_op} ${len(self.params)}"
