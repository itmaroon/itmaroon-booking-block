const defaultConfig = require("@wordpress/scripts/config/webpack.config");

/**
 * ブロック（src/blocks 以下の block.json から自動検出）に加えて、
 * 管理画面「予約管理」のスクリプトをビルドする。出力は build/admin/index.js。
 */
module.exports = {
	...defaultConfig,
	entry: async () => {
		const blockEntries = await defaultConfig.entry();
		return {
			...blockEntries,
			"admin/index": "./src/admin/index.tsx",
		};
	},
};
