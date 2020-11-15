export function isPromise(fn: any) {
	return fn && typeof fn.then == 'function' && typeof fn.catch == 'function';
}
