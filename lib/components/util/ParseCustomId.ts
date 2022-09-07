export interface ParsedCustomId {
	prefix?: string;
	id: string;
	state: Record<string, unknown>;
}

/**
 * custom_id format: primary delimeter is ","
 * the first group contains the id, remaining
 * groups contain k/v pair states delimetered by "="
 * Example of a full custom_id: some_id,foo=bar,bizz=bazz
 *
 * @param raw
 */
export function ParseCustomId(raw: string): ParsedCustomId {
	const parse: ParsedCustomId = { id: null, state: {} };

	const [id, ...rest] = raw.split(',');
	const prefix = id.split(':');
	if (prefix.length > 1) {
		parse.prefix = prefix.slice(0, -1).join(':');
		parse.id = prefix.at(-1);
	} else {
		parse.id = prefix[0];
	}

	// loop over state k/v pairs
	for (const kv of rest) {
		const [k, v] = kv.split('=');

		parse.state[k] = v ?? 'true';
	}

	return parse;
}
