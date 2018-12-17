const hacking = require('./hacking');
const fs = require('fs');
const _ = require('lodash');

const comp = _.flow;

const {
	pack,
	unpack,
	explode,
	implode,
	translate,
	untranslate,
	stringify,
	logExploded,
	byteify,
	convertFirstBlockByte,
	convertSecondBlockByte,
 } = hacking;

fs.existsSync('temp') || fs.mkdirSync('temp');

const files = {
	quiz: () => fs.readFileSync('testfiles/quiz.bin'),
	normal: () => fs.readFileSync('testfiles/Z000L010.bin')
}

test('explode is reversible',
 () => {
  const file = files.quiz();
  const composed = comp(explode, implode)(file);
  // Ensure we write the file, then read it again. JUST TO BE SURE
  fs.writeFileSync('temp/composed.bin', composed);
  const actual = fs.readFileSync('temp/composed.bin');
  expect(actual).toEqual(file);
});

test('exploded and translated quiz has answer', () => {
  const file = files.quiz();
  const translated = comp(explode, translate, stringify)(file);
  expect(translated).toContain('I make my own electricity at home');
});

test('translate is reversible', () => {
  const file = files.quiz();
  const actual = comp(explode, translate, untranslate, implode)(file);
  expect(actual).toEqual(file);
});

describe('translate is reversible even when written to a file', () => {
	const cases = [files.quiz(), files.normal()];
	cases.map((file, i) => test(`Scenario ${i}`, () => {
	  const translated = comp(explode, translate, implode)(file);
	  fs.writeFileSync('temp/translated.bin', translated);

	  const translatedLoaded = fs.readFileSync('temp/translated.bin');;
	  const untranslated = comp(explode, untranslate, implode)(translatedLoaded);
	  fs.writeFileSync('temp/untranslated.bin', untranslated);

	  const actual = fs.readFileSync('temp/untranslated.bin');;
	  expect(actual).toEqual(file);
	}));
});

test('translate is reversible even when written to a file', () => {
  const file = files.normal();
  const translated = comp(explode, translate, implode)(file);
  fs.writeFileSync('temp/translated.bin', translated);

  const translatedLoaded = fs.readFileSync('temp/translated.bin');;
  const untranslated = comp(explode, untranslate, implode)(translatedLoaded);
  fs.writeFileSync('temp/untranslated.bin', untranslated);

  const actual = fs.readFileSync('temp/untranslated.bin');;
  expect(actual).toEqual(file);
});

describe('conversion of first-block text', () => {
	[
		[0x00, 'A'], [0x02, 'C'], [0x03, 'B'],
		[0x20, 'a'], [0x3B, 'z'],
		[0x61, ' ']
	].map (([hex, expectedChar]) => 
		test(`it converts ${hex.toString(16)} to ${expectedChar}`, () => {
			var actual = convertFirstBlockByte(hex);
			expect(actual).toEqual(expectedChar.charCodeAt(0));
		}));
});

describe('conversion of second-block text', () => {
	[
		[0xEC, 'B'], [0xED, 'A'],
		[0x86, 'b'], [0x87, 'a'],
		[0xAB, ' '], [0xaa, '\''], [0xae, '.'], [0xa8, '%'],
		[0xb0, '-'], [0xb1, ','], [0xb2, '&'],
		[0xE3, '0'], [0xE2, '1'], [0xE5, '2'], [0xEA, '9']
	].map (([hex, expectedChar]) => {
		test(`it converts ${hex.toString(16)} to ${expectedChar}`, () => {
			var actual = convertSecondBlockByte(hex);
			expect(actual).toEqual(expectedChar.charCodeAt(0));
		});

		test(`it converts ${expectedChar} to ${hex.toString(16)} `, () => {
			var actual = convertSecondBlockByte(expectedChar.charCodeAt(0));
			expect(actual).toEqual(hex);
		});

		test(`it converts ${hex.toString(16)} to itself when run twice`, () => {
			var actual = comp(convertSecondBlockByte, convertSecondBlockByte)(hex);
			expect(actual).toEqual(hex);
		});
	}
)});

test('exploded and translated quiz has original words twice', () => {
  const file = files.quiz();
  const translated = comp(explode, translate, stringify)(file);

  const phrase = 'Save electricity';
  const regex = `${phrase}.*${phrase}`;
  expect(translated).toMatch(new RegExp(regex));
});

test('exploded and translated normal file has original words twice', () => {
  const file = files.normal();
  const translated = comp(explode, translate, stringify)(file);

  const phrase = 'Tango';
  const regex = `${phrase}.*${phrase}`;
  expect(translated).toMatch(new RegExp(regex));
});
