const hacking = require('./hacking');
const fs = require('fs');
const _ = require('lodash');

const {
	transform,
	untransform,
	modify,
	qify,
	replaceFromDict,
 } = hacking;

const args = process.argv.slice(2);

fs.existsSync("transformed-word") || fs.mkdirSync("transformed-word");

const transformFiles = (sourceDir, destinationDir, fn) => {
	const files = fs.readdirSync(sourceDir).filter(f => f.endsWith(".bin"));

	files.forEach(f => {
		const sourcePath = `${sourceDir}/${f}`;
		console.log(`Transforming ${sourcePath}...`);
		const bytes = fs.readFileSync(sourcePath);
		const transformed = fn(bytes);
		const destinationPath = `${destinationDir}/${f}`;
		fs.writeFileSync(destinationPath, transformed);
		console.log(`Wrote file ${destinationPath}`);
	});
};

// Code to overwrite all quizzes with the same file.
// This is an easy way to test out some things, as you can quickly
// play the quiz boss and it has a fixed set of files it reads from.
const overwriteQuizzes = () => {
	const files = fs.readdirSync('word');
	files.forEach(f => {
		const bytes = fs.readFileSync(`examples/quiz.bin`);
		// For all ZE0* files we write the same dummy wordset, to test it out.
		// These are all quiz questions.
		// Note that ZE00 files appear to not have words, so leave 'em be.
		if (f.indexOf('ZE0') === 0 && f.indexOf('ZE00') === -1) {
			const path = `transformed-word/${f}`;
			console.log('overwriting ' + path)
			fs.writeFileSync(path, bytes);
			return;
		}
	});
};

switch (args[0]) {
	case 'go':
		transformFiles('word', 'transformed-word', transform);
		transformFiles('transformed-word','transformed-word', modify(replaceFromDict));
		transformFiles('transformed-word','word', untransform);
		return;
	case 'translate':
		transformFiles('word', 'transformed-word', transform);
		return;
	case 'apply':
		transformFiles('transformed-word','word', untransform);
		return;
	case 'quiztest':
		overwriteQuizzes();
		return;
	case 'qtest':
		transformFiles('transformed-word','transformed-word', modify(qify));
		return;
	case 'dict-replace':
		transformFiles('transformed-word','transformed-word', modify(replaceFromDict));
		return;
	default:
		console.error(`Unrecognised argument: ${args[0]}`)
};
