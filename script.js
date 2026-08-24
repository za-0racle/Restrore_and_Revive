import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

const FIRESTORE_TIMEOUT_MS = 20000;

function submitWithTimeout(writePromise) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const error = new Error('Firebase did not respond within 20 seconds.');
            error.code = 'submission-timeout';
            reject(error);
        }, FIRESTORE_TIMEOUT_MS);
    });

    return Promise.race([writePromise, timeoutPromise])
        .finally(() => clearTimeout(timeoutId));
}

function getSubmissionError(error, type) {
    if (!navigator.onLine) {
        return `You appear to be offline. Your ${type} was not submitted.`;
    }

    if (error?.code === 'permission-denied') {
        return `Firebase blocked this ${type}. The Firestore security rules need to be published.`;
    }

    if (error?.code === 'submission-timeout' || error?.code === 'unavailable') {
        return `Firebase could not be reached. Please check that Firestore is enabled, then try again.`;
    }

    return `Your ${type} could not be submitted. Please try again.`;
}

document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================================
       1. Mobile Hamburger Menu Toggle
       ========================================================================= */
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Hamburger animation
            const spans = hamburger.querySelectorAll('span');
            navLinks.classList.contains('active') ? 
                spans[1].style.opacity = '0' : 
                spans[1].style.opacity = '1';
        });
    }

    /* =========================================================================
       2. Hero Background Image Carousel (Home Page)
       ========================================================================= */
    const slides = document.querySelectorAll('.carousel-slide');
    
    if (slides.length > 0) {
        let currentSlide = 0;

        // Switch to the next slide every 5 seconds (5000ms)
        setInterval(() => {
            // Remove 'active' class from current slide
            slides[currentSlide].classList.remove('active');
            
            // Increment index and loop back to 0 if at the end
            currentSlide = (currentSlide + 1) % slides.length;
            
            // Add 'active' class to new slide
            slides[currentSlide].classList.add('active');
        }, 5000); 
    }

    /* =========================================================================
       3. Scroll Animations (Aesthetic Fade-Ins for Cards, Sections)
       ========================================================================= */
    const fadeElements = document.querySelectorAll('.fade-in');

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Run animation only once
            }
        });
    }, { threshold: 0.1 });

    fadeElements.forEach(el => scrollObserver.observe(el));
    
    // Trigger visible class for elements already in viewport on load
    setTimeout(() => {
        fadeElements.forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
                el.classList.add('visible');
            }
        });
    }, 100);

    /* =========================================================================
       4. Home Page Contact Form Submission
       ========================================================================= */
    const homeForm = document.getElementById('homeContactForm');
    const successMsg = document.getElementById('contactSuccessMessage');

    if (homeForm) {
        homeForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page reload
            
            // Basic validation check
            if(homeForm.checkValidity()) {
                const submitButton = homeForm.querySelector('button[type="submit"]');
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Sending...';
                submitButton.disabled = true;

                try {
                    await submitWithTimeout(addDoc(collection(db, 'contacts'), {
                        fullName: document.getElementById('fullName').value.trim(),
                        phone: document.getElementById('phone').value.trim(),
                        email: document.getElementById('email').value.trim(),
                        status: 'new',
                        createdAt: serverTimestamp(),
                    }));

                    successMsg.textContent = 'Thank you! Your message has been sent.';
                    successMsg.classList.remove('hidden');
                    homeForm.reset();

                    setTimeout(() => successMsg.classList.add('hidden'), 4000);
                } catch (error) {
                    console.error('Contact submission failed:', error);
                    alert(getSubmissionError(error, 'message'));
                } finally {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                }
            }
        });
    }

    /* =========================================================================
       5. Booking Form Logic & Conditional Fields
       ========================================================================= */
    const bookingForm = document.getElementById('bookingForm');
    const injuryYes = document.getElementById('injuryYes');
    const injuryNo = document.getElementById('injuryNo');
    const injuryDetailsContainer = document.getElementById('injuryDetailsContainer');
    const injuryDetailsInput = document.getElementById('injuryDetails');

    // Toggle injury explanation field
    if (injuryYes && injuryNo && injuryDetailsContainer) {
        injuryYes.addEventListener('change', () => {
            if (injuryYes.checked) {
                injuryDetailsContainer.classList.remove('hidden');
                // Ensure field acts as conditionally required visually
                injuryDetailsInput.setAttribute('required', 'true');
            }
        });

        injuryNo.addEventListener('change', () => {
            if (injuryNo.checked) {
                injuryDetailsContainer.classList.add('hidden');
                injuryDetailsInput.removeAttribute('required');
                injuryDetailsInput.value = ''; // Clear out any text
            }
        });
    }

    /* =========================================================================
       6. Firestore Submission (Booking Form)
       ========================================================================= */
    const successModal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModal');
    const submitBtn = document.querySelector('.submit-btn');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (bookingForm.checkValidity()) {
                // 1. Change button text to show it's processing
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Processing...';
                submitBtn.style.opacity = '0.7';
                submitBtn.disabled = true;

                const formData = new FormData(bookingForm);
                const bookingData = {};

                for (const [key, value] of formData.entries()) {
                    const cleanKey = key.replace('[]', '');
                    if (bookingData[cleanKey]) {
                        bookingData[cleanKey] = Array.isArray(bookingData[cleanKey])
                            ? [...bookingData[cleanKey], value]
                            : [bookingData[cleanKey], value];
                    } else {
                        bookingData[cleanKey] = value;
                    }
                }

                try {
                    await submitWithTimeout(addDoc(collection(db, 'bookings'), {
                        ...bookingData,
                        status: 'new',
                        createdAt: serverTimestamp(),
                    }));

                    successModal.classList.remove('hidden');
                    bookingForm.reset();

                    if (injuryDetailsContainer) {
                        injuryDetailsContainer.classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Booking submission failed:', error);
                    alert(getSubmissionError(error, 'booking'));
                } finally {
                    // 4. Reset button back to normal state
                    submitBtn.textContent = originalBtnText;
                    submitBtn.style.opacity = '1';
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Close Modal Event
    if (closeModalBtn && successModal) {
        closeModalBtn.addEventListener('click', () => {
            successModal.classList.add('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scrolls smoothly to top of page
        });
    }

});
