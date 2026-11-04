import re
from enum import Enum, auto
from typing import List, Optional

class TokenType(Enum):
    EOF = auto()
    WORD = auto()
    PHRASE = auto()
    COLON = auto()
    NOT_EQUAL = auto()
    GREATER = auto()
    GREATER_EQUAL = auto()
    LESS = auto()
    LESS_EQUAL = auto()
    TILDE = auto()
    LPAREN = auto()
    RPAREN = auto()
    AND = auto()
    OR = auto()
    NOT = auto()

class Token:
    def __init__(self, token_type: TokenType, value: str, position: int):
        self.type = token_type
        self.value = value
        self.position = position

    def __repr__(self):
        return f"Token({self.type.name}, '{self.value}', {self.position})"

class Lexer:
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.len = len(text)

    def _skip_whitespace(self):
        while self.pos < self.len and self.text[self.pos].isspace():
            self.pos += 1

    def next_token(self) -> Token:
        self._skip_whitespace()

        if self.pos >= self.len:
            return Token(TokenType.EOF, "", self.pos)

        start = self.pos
        ch = self.text[self.pos]

        if ch == '(':
            self.pos += 1
            return Token(TokenType.LPAREN, "(", start)
        if ch == ')':
            self.pos += 1
            return Token(TokenType.RPAREN, ")", start)
        if ch == ':':
            self.pos += 1
            return Token(TokenType.COLON, ":", start)
        if ch == '=':
            self.pos += 1
            return Token(TokenType.COLON, "=", start)
        if ch == '~':
            self.pos += 1
            return Token(TokenType.TILDE, "~", start)

        if ch == '!' and self.pos + 1 < self.len and self.text[self.pos + 1] == '=':
            self.pos += 2
            return Token(TokenType.NOT_EQUAL, "!=", start)
        if ch == '>' and self.pos + 1 < self.len and self.text[self.pos + 1] == '=':
            self.pos += 2
            return Token(TokenType.GREATER_EQUAL, ">=", start)
        if ch == '>':
            self.pos += 1
            return Token(TokenType.GREATER, ">", start)
        if ch == '<' and self.pos + 1 < self.len and self.text[self.pos + 1] == '=':
            self.pos += 2
            return Token(TokenType.LESS_EQUAL, "<=", start)
        if ch == '<':
            self.pos += 1
            return Token(TokenType.LESS, "<", start)

        if ch == '"':
            return self._read_phrase()

        if ch == '-':
            self.pos += 1
            return Token(TokenType.NOT, "-", start)

        return self._read_word()

    def _read_phrase(self) -> Token:
        start = self.pos
        self.pos += 1
        phrase_chars = []
        while self.pos < self.len and self.text[self.pos] != '"':
            phrase_chars.append(self.text[self.pos])
            self.pos += 1

        if self.pos < self.len and self.text[self.pos] == '"':
            self.pos += 1

        return Token(TokenType.PHRASE, "".join(phrase_chars), start)

    def _read_word(self) -> Token:
        start = self.pos
        word_chars = []
        while self.pos < self.len:
            ch = self.text[self.pos]
            if ch.isspace() or ch in ('(', ')', ':', '=', '~', '<', '>'):
                break
            word_chars.append(ch)
            self.pos += 1

        val = "".join(word_chars)
        upper = val.upper()
        if upper == "AND":
            return Token(TokenType.AND, val, start)
        if upper == "OR":
            return Token(TokenType.OR, val, start)
        if upper == "NOT":
            return Token(TokenType.NOT, val, start)

        return Token(TokenType.WORD, val, start)

    def tokenize(self) -> List[Token]:
        tokens = []
        while True:
            t = self.next_token()
            tokens.append(t)
            if t.type == TokenType.EOF:
                break
        return tokens
