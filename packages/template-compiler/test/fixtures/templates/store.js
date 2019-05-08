import { elem, text, updateText, subscribeStore, addDisposeCallback } from "endorphin";

export default function template$0(host, scope) {
	const target$0 = host.componentView;
	const div$0 = target$0.appendChild(elem("div"));
	const p$0 = div$0.appendChild(elem("p"));
	p$0.appendChild(text("Store value is "));
	scope.text$1 = p$0.appendChild(text(host.store.data.foo));
	subscribeStore(host, ["foo"]);
	addDisposeCallback(host, template$0Unmount);
	return template$0Update;
}

function template$0Update(host, scope) {
	updateText(scope.text$1, host.store.data.foo);
}

function template$0Unmount(scope) {
	scope.text$1 = null;
}