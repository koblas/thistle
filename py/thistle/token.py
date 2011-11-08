from . import Thistle
from .utils import smart_split

class Token(object):
    TOKEN_TEXT = 0
    TOKEN_VAR = 1
    TOKEN_BLOCK = 2
    TOKEN_COMMENT = 3

    def __init__(self, token_type, contents):
        # token_type must be TOKEN_TEXT, TOKEN_VAR, TOKEN_BLOCK or TOKEN_COMMENT.
        self.token_type, self.contents = token_type, contents
        self.lineno = None

    def __str__(self):
        return '<%s token: "%s...">' % \
            ({self.TOKEN_TEXT: 'Text', self.TOKEN_VAR: 'Var', self.TOKEN_BLOCK: 'Block', self.TOKEN_COMMENT: 'Comment'}[self.token_type],
            self.contents[:20].replace('\n', ''))

    def split_contents(self):
        split = []
        bits = iter(smart_split(self.contents))
        for bit in bits:
            # Handle translation-marked template pieces
            if bit.startswith('_("') or bit.startswith("_('"):
                sentinal = bit[2] + ')'
                trans_bit = [bit]
                while not bit.endswith(sentinal):
                    bit = bits.next()
                    trans_bit.append(bit)
                bit = ' '.join(trans_bit)
            split.append(bit)
        return split
