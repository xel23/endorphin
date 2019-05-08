import { SourceNode } from 'source-map';
import { Node, Identifier, Program, ENDElement, ENDAttributeStatement, LiteralValue, ENDAttribute, Literal } from '@endorphinjs/template-parser';
import { Chunk, ChunkList, HelpersMap, PlainObject } from '../types';

/**
 * A prefix for Endorphin element and attribute names
 */
export const prefix = 'e';
const nsPrefix = prefix + ':';

const defaultHelpers = {
    'endorphin/helpers': ['emit', 'setState', 'setStore']
} as HelpersMap;

/**
 * Converts given HTML tag name to JS variable name
 */
export function nameToJS(name: string, capitalize: boolean = false): string {
    name = name
        .replace(/-(\w)/g, (str: string, p1: string) => p1.toUpperCase())
        .replace(/\W/g, '_');
    if (capitalize && name) {
        name = name[0].toUpperCase() + name.slice(1);
    }

    return name;
}

/**
 * Factory function for creating source node with given chunks and location of
 * given node
 */
export function sn(chunks?: Chunk | ChunkList, node?: Node, name?: string): SourceNode {
    const result = new SourceNode();
    if (name) {
        result.name = name;
    }

    if (Array.isArray(chunks)) {
        chunks = chunks.filter(Boolean);
        if (chunks.length) {
            result.add(chunks);
        }
    } else if (chunks) {
        result.add(chunks);
    }

    if (node && node.loc) {
        const pos = node.loc.start;
        result.line = pos.line;
        result.column = pos.column;
        result.source = node.loc.source;
    }

    return result;
}

/**
 * Check if given name can be used as property identifier literal
 */
export function isPropKey(name: string): boolean {
    return /^[a-zA-Z_$][\w_$]*$/.test(name);
}

/**
 * Check if given AST node is an identifier
 */
export function isIdentifier(node: Node): node is Identifier {
    return node.type === 'Identifier';
}

/**
 * Check if given AST node is a literal value
 */
export function isLiteral(node: Node): node is Literal {
    return node.type === 'Literal';
}

/**
 * Check if given AST node is a an expression
 */
export function isExpression(node: Node): node is Program {
    return node.type === 'Program';
}

/**
 * Check if given AST node is element
 */
export function isElement(node: Node): node is ENDElement {
    return node.type === 'ENDElement';
}

/**
 * Returns attribute with given name from tag name definition, if any
 */
export function getAttr(elem: ENDElement | ENDAttributeStatement, name: string): ENDAttribute {
    return elem.attributes.find(attr => isIdentifier(attr.name) && attr.name.name === name);
}

/**
 * Returns value of attribute with given name from tag name definition, if any
 */
export function getAttrValue(openTag: ENDElement | ENDAttributeStatement, name: string): LiteralValue {
    const attr = getAttr(openTag, name);
    if (attr && isLiteral(attr.value)) {
        return attr.value.value;
    }
}

/**
 * Returns control statement name from given tag name if possible
 * @param name Tag name
 */
export function getControlName(name: string): string {
    if (name.startsWith(nsPrefix)) {
        return name.slice(nsPrefix.length);
    }

    if (name.startsWith('partial:')) {
        return 'partial';
    }

    return null;
}

/**
 * Returns quoted string
 */
export function qStr(text: string): string {
    return JSON.stringify(text);
}

/**
 * Generates property getter code
 */
export function propGetter(name: string): string {
    return isPropKey(name) ? `.${name}` : `[${qStr(name)}]`;
}

/**
 * Generates property setter code
 */
export function propSetter(key: Chunk): Chunk {
    if (typeof key === 'string') {
        return isPropKey(key) ? key : qStr(key);
    }
    return sn(['[', key, ']']);
}

export function toObjectLiteral(map: Map<Chunk, Chunk>, indent: string = '\t', level: number = 0): SourceNode {
    const _indent = indent.repeat(level);
    const _innerIndent = indent.repeat(level + 1);
    const result = sn();
    let i = 0;

    result.add('{');
    map.forEach((value, key) => {
        if (i++ !== 0) {
            result.add(',');
        }

        result.add(['\n', _innerIndent, key, ': ', value]);
    });

    if (map.size) {
        result.add(`\n${_indent}`);
    }

    result.add(`}`);
    return result;
}

/**
 * Generates helpers lookup map
 */
export function prepareHelpers(...helpers: HelpersMap[]): PlainObject {
    const result: PlainObject = {};
    const items = [defaultHelpers, ...helpers];
    items.forEach(helper => {
        Object.keys(helper).forEach(key => {
            helper[key].forEach(value => result[value] = key);
        });
    });

    return result;
}

export function format(chunks: ChunkList, pfx: string = '', suffix: string = '\n'): ChunkList {
    const result: ChunkList = [];

    chunks.filter(isValidChunk).forEach((chunk, i, arr) => {
        if (i !== 0) {
            result.push(pfx);
        }

        result.push(chunk);
        if (needSemicolon(chunk)) {
            result.push(';');
        }

        if (i !== arr.length - 1 && chunk !== suffix) {
            result.push(suffix);
        }
    });
    return result;
}

/**
 * Check if semicolon is required for given chunk
 * @param chunk
 */
function needSemicolon(chunk: Chunk): boolean {
    if (!chunk) {
        return false;
    }

    if (typeof chunk === 'string') {
        return /\S/.test(chunk) && !/[;}]\s*$/.test(chunk);
    }

    return needSemicolon(chunk.children[chunk.children.length - 1]);
}

export function isValidChunk(chunk: Chunk | null): boolean {
    return chunk instanceof SourceNode
        ? chunk.children.length !== 0
        : chunk && chunk.length !== 0;
}