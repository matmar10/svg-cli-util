#!/usr/bin/env node

'use strict';

var fs = require('fs');
var glob = require('glob');
var program = require('commander');
var xml2js = require('xml2js');
var svg2png = require('svg2png');
var util = require('util');

var color, files = [];

program
  .version('0.0.1')
  .usage('<color> <file> [otherFiles...]')
  .action(function (clr, file, otherFiles) {
    color = (0 === clr.indexOf('#')) ? clr : '#' + clr;
    files.push(file);
    if (Array.isArray(otherFiles)) {
      files = files.concat(otherFiles);
    }
  })
  .option('-s, --scale <n>', 'Scale the image by the specified multiplier', parseFloat)
  .parse(process.argv)
;

if (typeof color === 'undefined') {
  console.error('No color given!');
  program.outputHelp();
  process.exit(1);
}

if (!files.length) {
  console.error('No files given!');
  program.outputHelp();
  process.exit(2);
}

function processFile(color, filename) {

  var builder, destination, imageSrc, scale;

  destination = filename + '.png';
  scale = program.scale || 1;
  imageSrc = fs.readFileSync(filename, 'utf8');
  builder = new xml2js.Builder();

  console.log('Processing file `' + filename + '`...');

  console.log('\t parsing SVG as XML...');
  xml2js.parseString(imageSrc, function (err, xml) {

    var i, j, k, elementName, svgElements = ['path', 'shape', 'polygon'];

    if (err) {
      console.log('Could not parse file as XML: ' + filename);
      process.exit(3);
      return;
    }

    if (!xml.svg || 'object' !== typeof xml.svg) {
      console.log('\t no `svg` object exists, ignoring!');
      return;
    }

    if (!xml.svg.g || !Array.isArray(xml.svg.g)) {
      console.log('\t no `svg.g` array exists, ignoring!');
      return;
    }

    for (i = 0; i < xml.svg.g.length; i++) {

      // process all fill-able elements
      for (j = 0; j < svgElements.length; j++) {
        elementName = svgElements[j];

        console.log('\t checking for ' + elementName);

        // only add fill property to elements we care about
        if (!xml.svg.g[i].hasOwnProperty(elementName)) {
          continue;
        }

        console.log('\t found ' + elementName);

        if (!Array.isArray(xml.svg.g[i][elementName])) {
          console.log('\t ' + elementName + ' is not an array, ignoring...');
          continue;
        }

        for (k = 0; k < xml.svg.g[i][elementName].length; k++) {

          // be sure that attribute property exists
          xml.svg.g[i][elementName][k].$ = xml.svg.g[i][elementName][k].$ || {};

          if (xml.svg.g[i][elementName][k].$.fill) {
            console.log('\t existing fill property of `' + xml.svg.g[i][elementName][k].$.fill + '` will be overwritten');
          }

          // write the actual color attribute
          xml.svg.g[i][elementName][k].$.fill = color;
        }
      }
    }

    console.log('\t rebuilding XML...');
    xml = builder.buildObject(xml);

    console.log('\t saving output XML back to source SVG file...');
    fs.writeFileSync(filename, xml);

    console.log('\t saving as PNG...');
    svg2png(filename, destination, scale, function (err) {
      if (err) {
        console.log('Could not write PNG: ', err);
        process.exit(4);
        return;
      }

      console.log('Successfully saved as PNG to: `' + destination + '`');
    });

  });
}

for (var i = 0; i < files.length; i++) {
  console.log('Expanding file pattern `' + files[i]);
  glob(files[i], function (err, globbedFiles) {
    if (err) {
      console.log(err);
      process.exit(5);
      return;
    }
    console.log('Processing files: ', globbedFiles);
    for (var j = 0; j < globbedFiles.length; j++) {
      processFile(color, globbedFiles[j]);
    }
  });
}


