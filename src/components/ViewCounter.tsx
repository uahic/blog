import { createSignal, onMount } from 'solid-js';
import { VIEWCOUNTER_API_URL } from '../consts';

interface Props {
	slug: string;
}

export default function ViewCounter(props: Props) {
	const [views, setViews] = createSignal<number | null>(null);

	onMount(async () => {
		const today = new Date().toISOString().slice(0, 10);
		const dedupeKey = `viewed-${props.slug}-${today}`;
		const alreadyCountedToday = localStorage.getItem(dedupeKey) === '1';

		try {
			const res = await fetch(
				`${VIEWCOUNTER_API_URL}/api/views/${encodeURIComponent(props.slug)}`,
				{ method: alreadyCountedToday ? 'GET' : 'POST' },
			);
			if (!res.ok) return;
			const data = await res.json();
			setViews(data.views);
			if (!alreadyCountedToday) localStorage.setItem(dedupeKey, '1');
		} catch {
			// view counter is best-effort; ignore failures (offline, API down, etc.)
		}
	});

	return (
		<span class="view-counter">
			{views() !== null ? ` · ${views()} views` : ''}
		</span>
	);
}
