import { useEffect, useState } from 'react';
import Shepherd from 'shepherd.js';

export const useShepherdTour = () => {
  const [tour, setTour] = useState(null);

  useEffect(() => {
    // Initialize Shepherd tour
    const newTour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'shadow-md bg-purple-dark',
        scrollTo: true,
        modalOverlayOpeningPadding: 10,
        cancelIcon: {
          enabled: true,
        },
        arrow: true,
      },
    });

    // Step 1: Welcome
    newTour.addStep({
      title: 'Welcome to Expense Tracker! 🎉',
      text: `
        <div class="shepherd-text">
          <p>Let's take a quick tour to help you get started with managing your expenses effectively.</p>
          <p>This tour will show you the main features and how to use them.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Skip Tour',
          classes: 'btn btn-secondary',
          action: () => newTour.cancel(),
        },
        {
          text: 'Start Tour',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 2: Dashboard Overview
    newTour.addStep({
      title: 'Dashboard Overview 📊',
      text: `
        <div class="shepherd-text">
          <p>This dashboard shows your expense summary at a glance:</p>
          <ul>
            <li><strong>Total Expenses:</strong> All your recorded expenses</li>
            <li><strong>Total Items:</strong> Number of items purchased</li>
            <li><strong>Average Expense:</strong> Your spending pattern</li>
            <li><strong>Payment Sources:</strong> Number of accounts you have</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '[data-tour="dashboard-cards"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 3: Payment Sources
    newTour.addStep({
      title: 'Payment Sources 💳',
      text: `
        <div class="shepherd-text">
          <p>Manage your payment methods here. You can:</p>
          <ul>
            <li>View all your payment sources (cards, accounts, etc.)</li>
            <li>See available balance for each source</li>
            <li>Add new payment sources</li>
          </ul>
          <p><strong>Tip:</strong> Add your payment sources first before recording expenses!</p>
        </div>
      `,
      attachTo: {
        element: '[data-tour="payment-sources"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 4: Add Payment Source Button
    newTour.addStep({
      title: 'Add Payment Source ➕',
      text: `
        <div class="shepherd-text">
          <p>Click here to add a new payment source.</p>
          <p>You can add credit cards, bank accounts, or any payment method you use.</p>
          <p><strong>Try it now!</strong> Click this button to add your first payment source.</p>
        </div>
      `,
      attachTo: {
        element: '[data-tour="add-payment-btn"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 5: Main Tabs
    newTour.addStep({
      title: 'Two Ways to Add Expenses 📝',
      text: `
        <div class="shepherd-text">
          <p>You have two convenient ways to track expenses:</p>
          <ul>
            <li><strong>Import Expenses:</strong> Upload CSV/Excel files or receipt images</li>
            <li><strong>Add Expense:</strong> Manually enter individual expenses</li>
          </ul>
          <p>Choose the method that works best for you!</p>
        </div>
      `,
      attachTo: {
        element: '[data-tour="main-tabs"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 6: File Upload
    newTour.addStep({
      title: 'Import Files 📂',
      text: `
        <div class="shepherd-text">
          <p>Upload your expense files here:</p>
          <ul>
            <li>CSV files with expense data</li>
            <li>Excel spreadsheets</li>
            <li>Receipt images (JPG, PNG)</li>
          </ul>
          <p>The system will automatically extract expense information!</p>
        </div>
      `,
      attachTo: {
        element: '[data-tour="file-upload"]',
        on: 'right',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 7: File List
    newTour.addStep({
      title: 'Your Files 📋',
      text: `
        <div class="shepherd-text">
          <p>All your uploaded files appear here.</p>
          <p>Click on any file to:</p>
          <ul>
            <li>View extracted expenses</li>
            <li>See receipt images</li>
            <li>Edit expense details</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '[data-tour="file-list"]',
        on: 'left',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 8: Expense List
    newTour.addStep({
      title: 'Expense Management 💰',
      text: `
        <div class="shepherd-text">
          <p>When you select a file, expenses appear here.</p>
          <p>You can:</p>
          <ul>
            <li>Review and edit each expense</li>
            <li>Select payment source for the transaction</li>
            <li>Bulk change dates for all expenses</li>
            <li>Save expenses to your records</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '[data-tour="expense-list"]',
        on: 'left',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Next',
          classes: 'btn btn-primary',
          action: () => newTour.next(),
        },
      ],
    });

    // Step 9: Manual Entry Tab
    newTour.addStep({
      title: 'Manual Entry Tab ✏️',
      text: `
        <div class="shepherd-text">
          <p>Click on "Add Expense" tab to manually enter expenses.</p>
          <p>Perfect for quick entries when you don't have a file to upload!</p>
        </div>
      `,
      attachTo: {
        element: '[data-tour="manual-tab"]',
        on: 'bottom',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Show Manual Form',
          classes: 'btn btn-primary',
          action: () => {
            // Switch to manual tab
            const manualTab = document.querySelector('[data-tour="manual-tab"]');
            if (manualTab) manualTab.click();
            newTour.next();
          },
        },
      ],
    });

    // Step 10: Manual Form (This step will show after switching tabs)
    newTour.addStep({
      title: 'Manual Expense Form 📝',
      text: `
        <div class="shepherd-text">
          <p>Fill out this form to add individual expenses:</p>
          <ul>
            <li><strong>Description:</strong> What did you buy?</li>
            <li><strong>Quantity & Price:</strong> How many and how much?</li>
            <li><strong>Category:</strong> Type of expense</li>
            <li><strong>Payment Source:</strong> Which account to use</li>
            <li><strong>Date:</strong> When did you make this purchase?</li>
          </ul>
        </div>
      `,
      attachTo: {
        element: '[data-tour="manual-form"]',
        on: 'top',
      },
      buttons: [
        {
          text: 'Previous',
          classes: 'btn btn-secondary',
          action: () => newTour.back(),
        },
        {
          text: 'Finish Tour',
          classes: 'btn btn-success',
          action: () => newTour.next(),
        },
      ],
    });

    // Final Step: Completion
    newTour.addStep({
      title: 'Tour Complete! 🎊',
      text: `
        <div class="shepherd-text">
          <h4>You're all set!</h4>
          <p>Here's what you learned:</p>
          <ul>
            <li>✅ How to add payment sources</li>
            <li>✅ How to import expense files</li>
            <li>✅ How to manually add expenses</li>
            <li>✅ How to manage and edit expenses</li>
          </ul>
          <p><strong>Pro Tip:</strong> Start by adding your payment sources, then begin tracking expenses!</p>
          <p>You can restart this tour anytime from the help menu.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Start Using App',
          classes: 'btn btn-success btn-lg',
          action: () => newTour.complete(),
        },
      ],
    });

    setTour(newTour);

    return () => {
      if (newTour) {
        newTour.complete();
      }
    };
  }, []);

  const startTour = () => {
    if (tour) {
      tour.start();
    }
  };

  const restartTour = () => {
    if (tour) {
      tour.start();
    }
  };

  return { startTour, restartTour, tour };
};

