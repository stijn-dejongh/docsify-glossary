import {configFromYaml, glossifyConfig} from './configuration';

export function replaceTerm(term, content, term_id) {
    let link = ` [$1](/_glossary?id=${term_id})`;

    let re = new RegExp(`\\s(${term})\\s`, 'ig');
    let reFullStop = new RegExp(`\\s(${term}).`, 'ig');
    let reComma = new RegExp(`\\s(${term}),`, 'ig');

    return content
            .replace(reComma, link + ',')
            .replace(re, link + ' ')
            .replace(reFullStop, link + '.');
}

export function addLinks(content, terms, config) {
    let textWithReplacements = content;
    if (config.debug) {
        console.log(`Adding links for terminology: ${terms}`);
    }
    for (let term in terms) {
        textWithReplacements = replaceTerm(term, textWithReplacements, terms[term]);
    }
    return textWithReplacements;
}

/**
 * @param {string} text
 * @param configuration
 * @return {string[]} dictionary with terminology
 */
export function loadTerminology(text, configuration) {
    let lines = text.split('\n');
    let dictionary = {};
    lines.forEach(function (line) {
        if (line.trimStart().startsWith(configuration.terminologyHeading)) {
            let term = line.replace(configuration.terminologyHeading, '').trim();
            if (configuration.debug) {
                console.log(`detected glossary term: ${term}`);
            }
            dictionary[term] = term.toLowerCase()
                    .replace(' ', '-');
        }
    });

    return dictionary;
}

function loadProperties() {
    if (window.$docsify !== undefined && window.$docsify.glossify !== undefined) {
        const configuredProperties = window.$docsify.glossify;
        return configFromYaml(configuredProperties);
    } else {
        return glossifyConfig()
                .build();
    }
}

function injectTerminologyInContent(content, configuration, next) {
    content = addLinks(content, window.$docsify.terms, configuration);
    next(content);
}

export function install(hook, _vm) {

    let configuration = loadProperties();
    if (configuration.debug) {
        console.log(`Using config options: ${configuration.glossaryLocation}, ${configuration.terminologyHeading}`);
    }
    hook.beforeEach(function (content, next) {

        if (window.location.hash.match(/_glossary/g)) {
            next(content);
            return;
        }

        if (!window.$docsify.terms) {
            fetch(configuration.glossaryLocation)
                    .then(function (data) {
                        data.text()
                                .then(function (text) {
                                    window.$docsify.terms = loadTerminology(text, configuration);
                                    injectTerminologyInContent(content, configuration, next);
                                });
                    });
        }

        injectTerminologyInContent(content, configuration, next);
    });
}
