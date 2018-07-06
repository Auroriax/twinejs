/*
A generic modal dialog component. This implements the Thenable mixin and
resolves itself when it is closed.
*/

const Vue = require('vue');
const eventHub = require('../../common/eventHub');
const domEvents = require('../../vue/mixins/dom-events');
const { thenable, symbols: { reject, resolve } } =
	require('../../vue/mixins/thenable');

const animationEndEvents = [
	'animationend',
	'webkitAnimationEnd',
	'MSAnimationEnd',
	'oAnimationEnd'
];

require('./index.less');

const ModalDialog = Vue.extend({
	template: require('./index.html'),

	props: {
		title: '',
		origin: null,
		canWiden: false,
		canClose: {
			type: Function,
			required: false
		}
	},

	data: () => ({
		wide: false
	}),

	computed: {
		classes() {
			return this.class + (this.wide ? ' wide' : '');
		}
	},

	mounted() {
		eventHub.$on('close', this.close);

		this.$nextTick(function () {
			// code that assumes this.$el is in-document
			const dialog = this.$el.querySelector('.modal-dialog');

			/*
			If an origin is specified,
			 set it as the point the modal dialog grows out of.
			*/

			if (this.origin) {
				const originRect = this.origin.getBoundingClientRect();

				dialog.style.transformOrigin =
					(originRect.left + originRect.width / 2) + 'px ' +
					(originRect.top + originRect.height / 2) + 'px';
			}

			let body = document.querySelector('body');

			body.classList.add('modalOpen');
			this.on(body, 'keyup', this.escapeCloser);

			/*
			We have to listen manually to the end of the transition in order to
			 an emit an event when this occurs;
			 it looks like Vue only consults the
			top-level element to see when the transition is complete.
			*/

			const notifier = () => {
				/*
				This event is currently only listened to by <code-mirror> child
				components.
				*/
				eventHub.$emit('transition-entered');
				animationEndEvents.forEach(event =>
					dialog.removeEventListener(event, notifier)
				);
			};

			animationEndEvents.forEach(event =>
				dialog.addEventListener(event, notifier)
			);
		});
	},

	destroyed() {
		let body = document.querySelector('body');

		body.classList.remove('modalOpen');
		this.$emit('destroyed');
	},

	methods: {
		close(message) {
			console.log("close-method modal", message);
			if (typeof this.canClose === 'function' && !this.canClose()) {
				return;
			}

			console.log("close-method modal emit", message);
			this.$emit('close', message);
		},

		toggleWide() {
			this.wide = !this.wide;
		},

		reject(message) {
			console.log("reject-method modal");
			if (typeof this.canClose === 'function' && !this.canClose()) {
				return;
			}

			this.$emit('reject', message);
		},

		escapeCloser(e) {
			if (e.keyCode === 27) {
				e.preventDefault();
				this.close();
			}
		},
		beforeEnter: function(el) {
			console.log("before entering", el);
			let overlay = el.querySelector('#modal-overlay');
			let dialog = el.querySelector('.modal-dialog');

			overlay.classList.add('fade-in-out-transition', 'fade-in-out-enter');
			dialog.classList.add('grow-in-out-enter');

			dialog.addEventListener('animationend', function() {
				dialog.classList.remove('grow-in-out-enter');
			});
		},

		enter: function(el, done) {
			console.log("entering", el);
			let overlay = el.querySelector('#modal-overlay');

			Vue.nextTick(() => {
				overlay.classList.remove('fade-in-out-enter');
				overlay.addEventListener('transitionend', done);
			});
		},

		leave: function(el, done) {
			console.log("leaving", el);
			let overlay = el.querySelector('#modal-overlay');
			let dialog = el.querySelector('.modal-dialog');

			dialog.classList.add('grow-in-out-leave');
			overlay.classList.add('fade-in-out-leave');
			overlay.addEventListener('transitionend', done);
		}
	},

	created: function() {
		eventHub.$on('close', (message) => {
			console.log("close-event modal", message);
			this[resolve](message);
			this.$destroy(true);
			console.log('destroyed');
		});

		eventHub.$on('reject', (message) => {
			console.log("reject-event modal");
			this[reject](message);
			this.$destroy(true);
		});
	},

	mixins: [domEvents, thenable]
});

module.exports = ModalDialog;
