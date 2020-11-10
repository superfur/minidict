import * as moment from 'moment';
import { search } from './service';
import { template } from './template';
import { start, success, fail } from './template/loader';
import { DictionaryType } from './utils/const';

/**
 * 单词查询
 */
export async function translate(words: string[], type: DictionaryType) {
    const startTime = Date.now();
    const sentence = words
        .map(word => word.trim())
        .join(' ')
        .slice(0, 240);

    start();
    try {
        const data = await search(sentence, type);
        const output = template(data);

        const endTime = Date.now();
        const duration = moment.duration(endTime - startTime).asSeconds();

        success(`Translate "${words}" in ${duration}s:`);
        console.log(output);
    } catch (err) {
        fail();
        console.error(err);
    }

};
