const CleanCSS = require('clean-css')
const uglifyJs = require('uglify-js')
const _ = require('lodash')

const cleanCss = new CleanCSS({ compatibility: '*' })
const emptyFn = () => 1

module.exports = (conf) => {
    const {
        output,
        build,
        bundles = [
            // {
            //     test: /need_bundle\/(\w+\/)?\w+.js/,
            //     dist: 'need_bundle/$1index.js'
            // }
        ],
        shouldUseMinify = emptyFn
    } = conf

    if (!output) {
        return
    }
    let bundleMap = {}
    return {
        onSet (pathname, data, store) {
            if (_.isPlainObject(data)) {
                return data
            }
            if (build) {
                bundles.map(({test, dist}) => {
                    if (test.test(pathname)) {
                        const target = pathname.replace(test, dist)
                        _.set(bundleMap, [target, pathname], 1)
                    }
                })
            }
            if (!build || !data || !shouldUseMinify(pathname, data)) {
                return data
            }
            const extType = (pathname.match(/\.(\w+)$/) || [])[1]
            switch (extType) {
            case 'js':
            case 'jsx':
            case 'es':
                data = uglifyJs.minify(data.toString()).code
                store._set(pathname.replace(/\.(\w+)$/, '.js'), data)
                break
            case 'less':
            case 'css':
                data = cleanCss.minify(data.toString()).styles
                store._set(pathname.replace(/\.(\w+)$/, '.css'), data)
                break
            default:
            }
            return data
        },
        outputFilter (pathname, data) {
            if (bundleMap[pathname]) {
                return true
            } else {
                // 命中一条则不输出
                return !bundles.filter(({test}) => test.test(pathname)).length
            }
        },
        onGet (pathname, data, store) {
            if (bundleMap[pathname]) {
                let res = data
                _.keys(bundleMap[pathname]).map(path => {
                    res = store._get(path) + '\r\n' + res
                })
                return res
            }
        },
        onRoute (pathname, req, resp, memory) {
            if (pathname === '/server-build-output') {
                require('../util/build')(() => {
                    resp.end('build ok!')
                })
                return false
            }
        },
        onDirectory (pathname, items) {
            items.push({
                name: '&lt;构建输出&gt;',
                href: '/server-build-output'
            })
        }
    }
}
