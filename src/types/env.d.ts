// ✅ グローバル宣言（ファイル拡張子の定義など）
declare global {
	/**
	 * PHP側から wp_localize_script で渡されるグローバル変数の定義
	 */
	declare const itmar_option: {
		home_url: string;
		[key: string]: any; // 他にプロパティがある場合のために拡張性を残す
	};

	// SVGやJSONの読み込み設定もここにまとめておくと便利です
	declare module "*.json" {
		const value: any;
		export default value;
	}

	declare module "*.svg" {
		import * as React from "react";
		export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
		const src: string;
		export default src;
	}

	declare module "*.scss" {
		const content: { [className: string]: string };
		export default content;
	}
}
import "@wordpress/block-editor";
declare module "@wordpress/block-editor" {
	// 実験的コンポーネントを型として定義
	export const __experimentalPanelColorGradientSettings: any;
	export const __experimentalBorderRadiusControl: any;
}
