import { ComponentAPI } from '@ayanaware/bento';
import { CommandContext, CommandDefinition, CommandEntity, CommandManager } from '@ayanaware/bentocord';
import { OptionType } from '@ayanaware/bentocord/commands/constants/OptionType';
import { SuppressorType } from '@ayanaware/bentocord/commands/constants/SuppressorType';

export class SubCommandTest implements CommandEntity {
	public name = 'subcommandtest';
	public api!: ComponentAPI;
	public parent = CommandManager;

	public definition: CommandDefinition = {
		name: ['top'],
		description: 'testing subcomand and groups',
		options: [
			{ type: OptionType.SUB_COMMAND_GROUP, name: 'hello', description: 'group hello', options: [
				{ type: OptionType.SUB_COMMAND, name: 'world', description: 'subcommand world', options: [
					{ type: OptionType.STRING, name: 'test', description: 'value test' }
				] },
			] },
			{ type: OptionType.SUB_COMMAND_GROUP, name: 'foo', description: 'group foo', options: [
				{ type: OptionType.SUB_COMMAND, name: 'bar', description: 'subcommand bar', options: [
					{ type: OptionType.NUMBER, array: true, name: 'test', description: 'value test' }
				] },
				{ type: OptionType.SUB_COMMAND, name: 'baz', description: 'subcommand baz', options: [
					{ type: OptionType.BOOLEAN, array: true, name: 'test', description: 'value test' }
				], suppressors: [ SuppressorType.BOT_OWNER ] }
			] },
		],
	};

	public async execute(ctx: CommandContext, options: {
		hello: { world: { test: string } },
		foo: { bar: { test: number } } ,	
	}) {
		return ctx.createResponse(JSON.stringify(options));
	}
}