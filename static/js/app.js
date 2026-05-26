document.addEventListener('DOMContentLoaded', () => {
    // Photo preview
    document.querySelectorAll('.photo-drop input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const drop = e.target.closest('.photo-drop');
            const preview = drop.querySelector('.preview');
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.src = ev.target.result;
                drop.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        });
    });

    // Load saved clinic/doctor info from localStorage
    const savedFields = ['clinic_name', 'clinic_address', 'clinic_phone', 'doctor_fio', 'doctor_position'];
    savedFields.forEach(id => {
        const el = document.getElementById(id);
        const saved = localStorage.getItem('dental_' + id);
        if (saved && el) el.value = saved;
    });

    // Form submit
    const form = document.getElementById('analysisForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('submitBtn');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        // Save clinic/doctor info
        savedFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) localStorage.setItem('dental_' + id, el.value);
        });

        const formData = new FormData(form);

        // Handle checkboxes
        if (!document.getElementById('has_braces').checked) {
            formData.set('has_braces', 'false');
        }
        if (!document.getElementById('has_implants').checked) {
            formData.set('has_implants', 'false');
        }

        try {
            const resp = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Ошибка сервера');
            }

            const data = await resp.json();
            showResults(data);
        } catch (err) {
            alert('Ошибка: ' + err.message);
        } finally {
            btn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    });
});

function showResults(data) {
    const section = document.getElementById('results');
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth' });

    // Overlay images
    document.getElementById('overlay_front').src = '/' + data.overlay_front;
    document.getElementById('overlay_right').src = '/' + data.overlay_right;
    document.getElementById('overlay_left').src = '/' + data.overlay_left;

    // Percentages
    document.getElementById('pct_front').textContent = data.plaque_pct_front;
    document.getElementById('pct_right').textContent = data.plaque_pct_right;
    document.getElementById('pct_left').textContent = data.plaque_pct_left;
    document.getElementById('pct_overall').textContent = data.plaque_pct_overall;

    // Indices
    document.getElementById('idx_fedorov').textContent = data.index_fedorov;
    document.getElementById('idx_fedorov_text').textContent = data.index_fedorov_text;
    document.getElementById('idx_api').textContent = data.index_api_lange + '%';
    document.getElementById('idx_api_text').textContent = data.index_api_text;
    document.getElementById('idx_ohis').textContent = data.index_ohi_s;
    document.getElementById('idx_ohis_text').textContent = data.index_ohi_s_text;

    // Recommendations
    document.getElementById('recommendations_text').textContent = data.recommendations;

    // PDF link
    const pdfLink = document.getElementById('downloadPdf');
    pdfLink.href = data.pdf_url;
}
