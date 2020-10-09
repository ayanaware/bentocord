import { Entity } from "@ayanaware/bento";

/**
 * Describes the structure of a KeyValue Storage like Entity
 * Used for various "persistent" storage in Bentocord
 */
export interface StorageLike extends Entity {
	/**
	 * Check if Key exists
	 * @param key Key
	 */
	has(key: string): Promise<boolean>;

	/**
	 * Get value of Key
	 * @param key Key
	 *
	 * @throws Error on irrecoverable state
	 * @returns Value
	 */
	get<T extends any>(key: string): Promise<T>;

	/**
	 * Set value of Key
	 * @param key Key
	 * @param value Value
	 *
	 * @throws Error on irrecoverable state
	 */
	set<T extends any>(key: string, value: T): Promise<void>;

	/**
	 * Delete value of Key
	 * @param key Key
	 *
	 * @throws Error on irrecoverable state
	 */
	delete(key: string): Promise<void>;
}
