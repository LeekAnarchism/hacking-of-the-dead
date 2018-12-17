# HACKING OF THE DEAD

## What is this?
This is a bunch of JS code to allow modification of words present in the PC version of [Sega's Typing Of The Dead](https://en.wikipedia.org/wiki/The_Typing_of_the_Dead).

## How does it work?
Crudely! It will go through all of the word resources files in the game, and replace strings it finds with one of equal length from your dictionary. The replacement is down pseuo-randomly using a hash function based on the string.

The string-detection logic is paranoid not to touch anything we can't easily replace, so it doesn't change all the strings in the game -- but it changes enough for it to be a laugh.

## How to use

### Pre-requisites

* You need to own the PC version of the game. Try checking out your local Electronics Boutique to see if they have a copy.
* Ensure you have node >= 10.8 and npm >= 6.2
* Check this repo out in the same directory as ttotd. You can do this via a fetch, as git will otherwise complain (as it's a bit weird):
```
cd ttotd
git init
git remote add origin <url of this repo>
git fetch origin
git checkout -b master --track origin/master # origin/master is clone's default
```

### Curating words

Modify `lib/words.txt` to contain all the funny words you want to use. Make sure you have a good distribution of word lengths.

### Transforming the files

Run `node index.js go` to words within the files in the `word` directory.

## How to run the tests
Yes, there are tests!

`npm test` to run once
`npm test:watch` to keep running every time the code changes

## How to work on the code

Oh boy, good luck. It's a bit of a mess. Sorry.

You can run just partial steps to translate / replace as follows:

* `node index.js translate` to copy and translate word files to the working directory `transformed-word`. Here you can view them in a text editor and read the text or make manual changes.
* `node index.js dict-replace` to automatically replace words in `transformed-word` with those from words.txt. The algorithm replaces words in a pseudorandom but repeatable way, and is cautious to not touch stuff that looks a bit wacky.
* `node index.js apply` to untranslate and copy working files back to the `word` directory.

## Things to improve

### Features

* Ensure all phrases are replaceable -- at the moment many are missed out. These are logged out.
* Understand the file format to allow for true customisation of the dictionaries, instead of
  just replacing strings of the same size. I expect the top of each file is a table of contents.
* Allow for editing of quiz questions -- these currently get the same find-and-random-replace treatment,
  which is funny but nonsensical.

### General code improvements

Looking for something to do? Here you go:

* Speed up processing -- currently it's not parallelised at all
* Refactoring: split up hacking.js, because it's huge
* Speed up the tests -- sometimes Jest is very slow to start up
