/* eslint-disable @typescript-eslint/naming-convention */
export class EmbedBuilder {
	public type: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link' = 'rich';

	public title: string;
	public description: string;
	public url: string;

	public color: number;

	public author: EmbedAuthor;

	public fields: Array<EmbedField> = [];

	public image: EmbedMedia;
	public thumbnail: EmbedMedia;

	public footer: EmbedFooter;
	public timestamp: string | Date;

	public setTitle(title: string): this {
		this.title = title;

		return this;
	}

	public setDescription(description: string): this {
		this.description = description;

		return this;
	}

	public setUrl(url: string): this {
		this.url = url;

		return this;
	}

	public setColor(color: number): this {
		this.color = color;

		return this;
	}

	public setAuthor(name: string, url?: string, iconUrl?: string): this {
		this.author = { name, url, icon_url: iconUrl };

		return this;
	}

	public addField(name: string, value?: string, inline: boolean = false): this {
		this.fields.push({ name, value, inline });

		return this;
	}

	public setThumbnail(url: string): this {
		this.thumbnail = { url };

		return this;
	}

	public setImage(url: string): this {
		this.image = { url };

		return this;
	}

	public setFooter(text: string, iconUrl?: string): this {
		this.footer = { text, icon_url: iconUrl };

		return this;
	}

	public setTimestamp(timestamp: (string | Date) = new Date()): this {
		this.timestamp = timestamp;

		return this;
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public toJSON() {
		return {
			type: this.type,
			title: this.title,
			description: this.description,
			url: this.url,
			author: this.author,
			timestamp: this.timestamp,
			color: this.color,
			fields: this.fields,
			thumbnail: this.thumbnail,
			image: this.image,
			footer: this.footer,
		};
	}
}

export interface EmbedAuthor {
	name: string;
	url?: string;
	icon_url?: string;
}

export interface EmbedMedia {
	url: string;
	proxy_url?: string;
	height?: number;
	width?: number;
}

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface EmbedFooter {
	text: string;
	icon_url?: string;
	proxy_icon_url?: string;
}
