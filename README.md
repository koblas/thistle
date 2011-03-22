
Thistle Templates
-----------------

While Mustache templates are great - having a bit of logic around is even better!  This all
originated that there isn't a good portable template language across languages.  Also, I 
wanted a template language that was "Human" safe, thus allowing for somebody to create a
template that they could "upload" and I could render that wouldn't _typicall_ cause the
end of the world or some simple cross site scripting attack.

Languages like PHP assume that everything is safe, while in practice you spend all of  your
time escaping the variables.  Django is nice that it assume the variable is unsafe, plus
it's fairly feature rich and support a good extension methodology.

Hence, **Thistle templates** - Django compatible cross language templates.

