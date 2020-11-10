import * as path from 'path';
// import * as debug from '../utils/debug';
import plugins from '../utils/plugins';

function useAllPlugins(types) {
  let count = 0;
  for (let i in types) {
    if (types[i]) count++;
  }
  return count === 0 || count === 3;
}

export function search(words: string, types) {
  if (plugins && !plugins.length) {
    console.log('没有启用任何插件');
    return;
  }

  const isAll = useAllPlugins(types);

  const pluginList = plugins.filter(p => {
    const pn = p.split('-')[1];
    if (isAll) {
      return true;
    } else {
      return types[pn];
    }
  }).map(plugin => {
    // debug(`load plugin ${plugin} use config: %O`, config.plugins[plugin]);
    const pluginPath = path.join(__dirname, '../plugins/', plugin);
    return require(pluginPath)(words);
  });

  return Promise.all(pluginList).then(data => {
    const successData = [];
    
    data.forEach(item => {
      // if (item.error.code !== 0) {
      //   debug(`${item.pluginName} error: ${item.error.message}`);
      // }

      successData.push(item);
    });

    return Promise.resolve(successData);
  });
};

