import { createSignal } from 'solid-js';
import { WEB3FORMS_ACCESS_KEY } from '../consts';

type Status = 'idle' | 'sending' | 'success' | 'error';

export default function ContactForm() {
	const [status, setStatus] = createSignal<Status>('idle');
	const [errorMessage, setErrorMessage] = createSignal('');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.currentTarget as HTMLFormElement;
		setStatus('sending');

		try {
			const res = await fetch('https://api.web3forms.com/submit', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body: new FormData(form),
			});
			const data = await res.json();
			if (data.success) {
				setStatus('success');
				form.reset();
			} else {
				setErrorMessage(data.message ?? 'Something went wrong. Please try again later.');
				setStatus('error');
			}
		} catch {
			setErrorMessage('Something went wrong. Please try again later.');
			setStatus('error');
		}
	}

	return (
		<form class="contact-form" onSubmit={handleSubmit}>
			<input type="hidden" name="access_key" value={WEB3FORMS_ACCESS_KEY} />
			<input type="hidden" name="subject" value="New message from the blog contact form" />
			<input
				type="checkbox"
				name="botcheck"
				tabIndex={-1}
				autocomplete="off"
				style={{ display: 'none' }}
			/>

			<label>
				Name
				<input type="text" name="name" required maxlength={200} />
			</label>
			<label>
				Email
				<input type="email" name="email" required maxlength={200} />
			</label>
			<label>
				Message
				<textarea name="message" required maxlength={5000} rows={6} />
			</label>

			<div class="h-captcha" data-captcha="true" data-theme="dark"></div>

			<button type="submit" disabled={status() === 'sending'}>
				{status() === 'sending' ? 'Sending…' : 'Send'}
			</button>

			{status() === 'success' && (
				<p class="form-message success">Thanks! Your message was sent.</p>
			)}
			{status() === 'error' && (
				<p class="form-message error">{errorMessage()}</p>
			)}
		</form>
	);
}
