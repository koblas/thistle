from . import Thistle
from .token import Token
import re

tag_re = re.compile('(%s.*?%s|%s.*?%s|%s.*?%s)' % (re.escape(Thistle.BLOCK_TAG_START), re.escape(Thistle.BLOCK_TAG_END),
                                          re.escape(Thistle.VARIABLE_TAG_START), re.escape(Thistle.VARIABLE_TAG_END),
                                          re.escape(Thistle.COMMENT_TAG_START), re.escape(Thistle.COMMENT_TAG_END)))

class Lexer(object):
    def __init__(self, template_string, origin=None):
        self.template_string = template_string
        self.origin = origin
        self.lineno = 1

    def tokenize(self):
        "Return a list of tokens from a given template_string."
        in_tag = False
        result = []
        for bit in tag_re.split(self.template_string):
            if bit:
                result.append(self.create_token(bit, in_tag))
            in_tag = not in_tag
        return result

    def create_token(self, token_string, in_tag):
        """
        Convert the given token string into a new Token object and return it.
        If in_tag is True, we are processing something that matched a tag,
        otherwise it should be treated as a literal string.
        """
        if in_tag:
            if token_string.startswith(Thistle.VARIABLE_TAG_START):
                token = Token(Token.TOKEN_VAR, token_string[len(Thistle.VARIABLE_TAG_START):-len(Thistle.VARIABLE_TAG_END)].strip())
            elif token_string.startswith(Thistle.BLOCK_TAG_START):
                token = Token(Token.TOKEN_BLOCK, token_string[len(Thistle.BLOCK_TAG_START):-len(Thistle.BLOCK_TAG_END)].strip())
            elif token_string.startswith(Thistle.COMMENT_TAG_START):
                content = ''
                if token_string.find(Thistle.TRANSLATOR_COMMENT_MARK):
                    content = token_string[len(Thistle.COMMENT_TAG_START):-len(Thistle.COMMENT_TAG_END)].strip()
                token = Token(Token.TOKEN_COMMENT, content)
        else:
            token = Token(Token.TOKEN_TEXT, token_string)
        token.lineno = self.lineno
        self.lineno += token_string.count('\n')
        return token
