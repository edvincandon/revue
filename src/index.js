import dotProp from 'dot-prop'

// to valid and match like `a as x.y.z`
const re = /^([\w\.-]+)\s+as\s+([\w\.-]+)$/i

const isDev = process.env.NODE_ENV !== 'production'

function parseProp(prop) {
	// realProp: property name/path in your instance
	// storeProp: property name/path in Redux store
	let realProp = prop
	let storeProp = prop
	if (re.test(prop)) {
		[, storeProp, realProp] = prop.match(re)
	}
	return {storeProp, realProp}
}

function deepProp(obj, path){
	return path.split('.').reduce((o, p) => o[p], obj);
};

/**
 * Extend Vue prototype + global mixin
 *
 * @param {Vue} Vue
 */
function applyMixin(Vue) {
	Vue.mixin({
		created() {
			if (this._bindProps) {
				const handleChange = () => {
					this._bindProps.forEach(prop => {
						const {storeProp, realProp} = prop
						if (realProp && storeProp) {
							dotProp.set(this, realProp, deepProp(this.$store.store.getState(), storeProp))
						}
					})
				}
				this._unsubscribe = this.$store.store.subscribe(handleChange)
			}
		},
		beforeDestroy() {
			if (this._unsubscribe) {
				this._unsubscribe()
			}
		}
	})
	Vue.prototype.$select = function (prop) {
		// realProp: property name/path in your instance
		// storeProp: property name/path in Redux store
		this._bindProps = this._bindProps || []
		prop = parseProp(prop)
		this._bindProps.push(prop)
		return deepProp(this.$store.store.getState(), prop.storeProp)
	}

	Object.defineProperty(Vue.prototype, '$store', {
    get: function $store() {
				if (!this.$root.store) {
					throw new Error('No $store provided to root component');
				}
        return this.$root.store;
    }
	});
}

const RevueInstaller = {
	install(_Vue) {
		applyMixin(_Vue);
	}
}

export default class Revue {
	constructor(Vue, reduxStore, reduxActions) {
    Vue.use(RevueInstaller);
		this.store = reduxStore
		if (reduxActions) {
			this.reduxActions = reduxActions
		}
	}
	get state() {
		return this.store.getState()
	}
	get actions() {
		if (isDev && !this.reduxActions) {
			throw new Error('[Revue] Binding actions to Revue before calling them!')
		}
		return this.reduxActions
	}
	dispatch(...args) {
		return this.store.dispatch(...args)
	}
}
