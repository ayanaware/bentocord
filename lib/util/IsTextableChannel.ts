import { AnyChannel, TextableChannel } from 'eris';

import { AllTextChannelTypes } from '../commands/constants/ChannelTypes';

export function IsTextableChannel(channel: unknown): channel is TextableChannel {
	const cast = channel as AnyChannel;
	if (!cast || typeof cast.type !== 'number') return false;

	return (AllTextChannelTypes as Array<number>).includes(cast.type);
}
