require('./lib/langhacks')
const _ = require('lodash');
const fs = require('fs');

const dict = require('./lib/dictionary')

const byteToChar = c => String.fromCharCode(c);
const bytesToString = bs => bs.map(byteToChar).join('');
const charToByte = c => c.charCodeAt(0);

// Separate a file's bytes into arrays which start with
//   0xBE
// which are the delimiters for text in the word files.
// Break after each block of 0xBE
const explode = (bytes) => {
	let segment = 0;
	const groups = [[]];
	for (var i = 0; i < bytes.length; i++) {
		groups[segment].push(bytes[i]);
		if (bytes[i] === 0xBE || bytes[i+1] === 0xBE) {
			segment++;
			groups[segment] = [];
		}
	}
	return groups;
}

const concat = (x,y) => x.concat(y);

const implode = (groups) => {
	return Buffer.from(groups.flatten());
}

const firstBlockAlphabets = [{
	  chars: 'A',
	  min: 0x00,
	  max: 0x00,
	}, {
	  chars: 'CBEDGFIHKJMLONQPSRUTWVYX',
	  min: 0x02,
	  max: 0x19,
 	}, {
	  chars: 'Z',
	  min: 0x1b,
	  max: 0x1b, 	
	}, {
	  chars: 'a',
	  min: 0x20,
	  max: 0x20,
	}, {
	  chars: 'cbedgfihkjmlonqpsrutwvyx',
	  min: 0x22,
	  max: 0x39,
	}, {
	  chars: 'z',
	  min: 0x3b,
	  max: 0x3b,
}];

// Second-block bytes are weird.
const secondBlockAlphabets = [{
	chars: 'VUXWZYbadcfehgjilknmporqtsvuxwzy',
	min: 0x80,
	max: 0x9F,
}, {
	chars: '1032547698BADCFEHGJILKNMPORQTS',
	min: 0xE2,
	max: 0xFF,
},{
	chars: ' ',
	min: 0xAB,
	max: 0xAB,
}, {
	chars: '.',
	min: 0xAE,
	max: 0xAE,
}, {
	chars: '\'',
	min: 0xAA,
	max: 0xAA,
}, {
	chars: '%',
	min: 0xA8,
	max: 0xA8,
}, {
	chars: '-,&',
	min: 0xB0,
	max: 0xB2,
}];

const supportedCharacters = secondBlockAlphabets.map(a => a.chars).join('');

// We swap the encoded letters for the ASCII equivalants, and vice versa,
// so that this function is self-inverse. Lovely jubbly.
const convertByteFromAlphabets = (b, alphabets) => {
	for (alpha of alphabets) {
		// Convert translated letters to ASCII letters
		if (_.inRange(b, alpha.min, alpha.max + 1)) {
			const asciiChar = alpha.chars[b - alpha.min];
			return charToByte(asciiChar);
		}
		// Convert ASCII letters to translated letters, so we don't lose information.
		const index = alpha.chars.indexOf(String.fromCharCode(b));
		if (index !== -1) {
			return alpha.min + index; 
		}
	}
	// Everything else can stay put
	return b;
};

const convertFirstBlockByte = (b) => convertByteFromAlphabets(b, firstBlockAlphabets);
const convertSecondBlockByte = (b) => convertByteFromAlphabets(b, secondBlockAlphabets);

const firstBlockMajickCode = 0x01;
const secondBlockMajickCode = 0x02;
const otherBlockMajickCode = 0x03;

const translateLine = (line) => {
	// If it's a delimiter, leave it be
	if (_.isEqual(line, [0xBE])) {
		return line;
	}
	// Inspect first character to figure out what kind of string this is
	// and prepend an indicator for detranslation
	const firstChar = line[0];
	if (_.some(firstBlockAlphabets, alpha => _.inRange(firstChar, alpha.min, alpha.max + 1))) {
		return [firstBlockMajickCode].concat(line.map(convertFirstBlockByte));
	}
	if (_.some(secondBlockAlphabets, alpha => _.inRange(firstChar, alpha.min, alpha.max + 1))) {
		return [secondBlockMajickCode].concat(line.map(convertSecondBlockByte));
	}
	// Something else, preserve it
	return [otherBlockMajickCode].concat(line);
}

const formatLineForLog = (line) => line.map(c => c.toString(16)).join(' ');

const revertLine = (line) => {
	// If it's a delimiter, leave it be
	if (_.isEqual(line, [0xBE])) {
		return line;
	}
	// Inspect first character to figure out what kind of string this is.
	// Also remove the prepended indicator.
	const firstChar = line.shift();
	if (firstChar === firstBlockMajickCode) {
		return line.map(convertFirstBlockByte);
	}
	if (firstChar === secondBlockMajickCode) {
		return line.map(convertSecondBlockByte);
	}
	if (firstChar === otherBlockMajickCode) {
		return line;
	}
	throw new Error(`Invalid first character: ${firstChar.toString(16)}.
		Line is: ${formatLineForLog(line)}`);
}

const qify = (line) => {
	// Turn all caps into Qs for testing
	// return line;
    return line.map(c => _.inRange(c, 0x41, 0x5a) ? 0x51 : c);
};

const isAlphaNumeric = (c) => supportedCharacters.indexOf(String.fromCharCode(c)) !== -1;

const isUpperCase = (c) => _.inRange(c, 'A'.charCodeAt(0), 'Z'.charCodeAt(0));

function mod(n, m) {
  return ((n % m) + m) % m;
}

const replaceFromDict = (line) => {
	const oldWord = (line.slice(1, -1));
	if (_.some(oldWord, c => !isAlphaNumeric(c))) {
		console.log("doesn't look like a word: " + bytesToString(oldWord))
		return line;
	}
	// Only return things that look like normal words, i.e.
	// start with a captial and are lowercase for the rest
	if (!isUpperCase(oldWord[0])) {
		return line;
	}
	if (_.some(oldWord.slice(1), isUpperCase)) {
		return line;
	}
	const wordLength = oldWord.length;
	const newWordMenu = dict.byLength[wordLength];
	if (!newWordMenu) {
		return line;
	}
	const hash = bytesToString(oldWord).hashCode();
	console.log(typeof newWordMenu.length)
	const index = mod(hash, newWordMenu.length);
	const newWord = newWordMenu[index]
	console.log(`Replacing ${bytesToString(oldWord)} with ${newWord}`);
	const wordAsBytes = _.map(newWord, charToByte);
	const result = [line[0]].concat(wordAsBytes).concat(_.last(line));
	if (result.length != line.length) {
		const msg = `Broke line:
Old (length ${line.length}): ${bytesToString(line)}
New (length ${result.length}): ${bytesToString(result)}
`;
		console.error(msg);
		throw new Error(msg);
	}
	return result;
};

const modifyLine = (line, fn) => {
	// If it's a delimiter, leave it be
	if (_.isEqual(line, [0xBE])) {
		return line;
	}
	// Inspect first character to figure out what kind of string this is.
	// Also remove the prepended indicator.
	const firstChar = line[0];
	if ([firstBlockMajickCode, secondBlockMajickCode].indexOf(firstChar) !== -1) {
		return fn(line);
	}
	if (firstChar === otherBlockMajickCode) {
		return line;
	}
	throw new Error(`Invalid first character: ${firstChar.toString(16)}.
		Line is: ${formatLineForLog(line)}`);
};

// Translates an exploded file into a readable one via a hex editor by
// shifting the bytes.
// Retains the exploded structure.
const translate = (exploded) => {
	return exploded.map(translateLine);
}

const untranslate = (exploded) => {
	return exploded.map(revertLine);
}

// Converts an exploded file into a readable string for inspection.
const stringify = (exploded) => {
	// Avoid using multi-arg version of fromCharCode
	return exploded.flatten().map(byteToChar).join('');
}
// Logs exploded but retaining structure
const logExploded = (exploded) => {
	console.log((exploded.map(l => l.map(byteToChar).join(''))));
	return exploded;
}

const byteify = (exploded) => {
	return exploded.flatten().map(c => c.toString(16)).join(' ');
}

// Convert bytes of entire file to readable format
const transform = _.flow(explode, translate, implode);
// Convert bytes of readable format back to game format
const untransform = _.flow(explode, untranslate, implode);
// Perform alphanumeric changes to translated text
const modify = fn => _.flow(explode, x => x.map(l => modifyLine(l,fn)), implode);

module.exports = {
	explode,
	implode,
	translate,
	untranslate,
	stringify,
	logExploded,
	byteify,
	convertFirstBlockByte,
	convertSecondBlockByte,
	transform,
	untransform,
	qify,
	replaceFromDict,
	modifyLine,
	modify
};
