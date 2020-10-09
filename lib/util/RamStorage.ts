import { ComponentAPI } from "@ayanaware/bento";
import { StorageLike } from "../interfaces";

export class RamStorage implements StorageLike {
	public name = 'RamStorage';
	public api!: ComponentAPI;

	private data: Map<string, any> = new Map();

	async has(key: string) {
		return this.data.has(key);
	}

	async get<T extends any>(key: string) {
		return this.data.get(key) as T;
	}

	async set<T extends any>(key: string, value: T) {
		this.data.set(key, value);
	}

	async delete(key: string) {
		this.data.delete(key);
	}
}