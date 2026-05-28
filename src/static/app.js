document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: initials from email
  function getInitials(email) {
    const namePart = (email || "").split('@')[0] || '';
    const parts = namePart.split(/[_\.\-]/).filter(Boolean);
    if (parts.length === 0) return (email || '').slice(0,2).toUpperCase();
    return parts.map(s => s[0].toUpperCase()).slice(0,2).join('');
  }

  // Helper: simple deterministic hash
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Helper: generate HSL color from email (pastel tones)
  function colorForEmail(email) {
    const h = hashString(email) % 360;
    const s = 60; // lower saturation for pastel
    const l = 75; // higher lightness for pastel
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  // Helper: choose readable text color based on lightness
  function textColorForEmail(email) {
    const l = 75;
    return l > 65 ? '#222' : '#fff';
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and reset activity select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section separately so avatars can get deterministic colors
        let participantsSection = '';
        if (details.participants && details.participants.length) {
          const avatarsHtml = details.participants.map(p => `<span class="avatar" data-email="${p}" title="${p}">${getInitials(p)}</span>`).join('');
          const listHtml = `<ul>${details.participants.map(p => `<li><span class="participant-email">${p}</span><button class="delete-participant" data-email="${p}" data-activity="${name}" title="Unregister">✕</button></li>`).join('')}</ul>`;
          participantsSection = `
            <div class="participants">
              <div class="participants-header">
                <strong>Participants</strong>
                <span class="participant-count">${details.participants.length}</span>
              </div>
              <div class="avatars">${avatarsHtml}</div>
              ${listHtml}
            </div>
          `;
        } else {
          participantsSection = `
            <div class="participants">
              <div class="participants-header">
                <strong>Participants</strong>
                <span class="participant-count">0</span>
              </div>
              <p class="no-participants">No participants yet</p>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsSection}
        `;

        activitiesList.appendChild(activityCard);

        // Apply deterministic avatar colors and ensure readable text color
        activityCard.querySelectorAll('.avatar').forEach(el => {
          const email = el.dataset.email || '';
          const bg = colorForEmail(email);
          el.style.background = bg;
          el.style.color = textColorForEmail(email);
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);

      // Refresh activities to reflect new participant
      await fetchActivities();
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation for unregistering participants
  activitiesList.addEventListener('click', async (e) => {
    const target = e.target;
    if (target && target.matches('.delete-participant')) {
      const email = target.dataset.email;
      const activityName = target.dataset.activity;
      if (!email || !activityName) return;
      if (!confirm(`Unregister ${email} from ${activityName}?`)) return;
      try {
        const res = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: 'POST' });
        const result = await res.json().catch(() => ({}));
        if (res.ok) {
          messageDiv.textContent = result.message || 'Participant unregistered';
          messageDiv.className = 'success';
          messageDiv.classList.remove('hidden');
          setTimeout(() => messageDiv.classList.add('hidden'), 4000);
          await fetchActivities();
        } else {
          messageDiv.textContent = result.detail || 'Failed to unregister participant';
          messageDiv.className = 'error';
          messageDiv.classList.remove('hidden');
        }
      } catch (err) {
        messageDiv.textContent = 'Network error while unregistering';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
      }
    }
  });

  // Initialize app
  fetchActivities();
});
