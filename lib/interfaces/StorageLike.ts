import { Entity } from "@ayanaware/bento";

/**
 * Describes the structure of a KeyValue Storage like Entity
 * Used for various "persistent" storage in Bentocord
 * 
 * There is support for optional id's in this system. And when
 * defined they must and should be handled. Basically Bentocord
 * expects that `has('prefix', 123)` and `has('prefix', 456)` to
 * be associated with seperate pieces of data. It's designed this way
 * to allow for key
 */
export interface StorageLike extends Entity {
	/**
	 * Check if Key exists
	 * @param key Key
	 * @param id Id
	 */
	has(key: string, id?: string): Promise<boolean>;

	/**
	 * Get value of Key
	 * @param key Key
	 * @param id Id
	 *
	 * @throws Error on irrecoverable state
	 * @returns Value
	 */
	get<T extends any>(key: string, id?: string): Promise<T>;

	/**
	 * Set value of Key
	 * @param key Key
	 * @param value Value
	 * @param id Id
	 *
	 * @throws Error on irrecoverable state
	 */
	set<T extends any>(key: string, value: T, id?: string): Promise<void>;

	/**
	 * Delete value of Key
	 * @param key Key
	 * @param id Id
	 *
	 * @throws Error on irrecoverable state
	 */
	delete(key: string, id?: string): Promise<void>;
}
