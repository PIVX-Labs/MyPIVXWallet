import { vi, expect, describe, it } from 'vitest';

import { describe, it, expect, vi } from 'vitest';
import {
    Alert,
    AlertController,
    createAlert,
} from '../../scripts/alerts/alert.js'; // Replace with your actual file path

describe('Alert class', () => {
    it('should create an alert with provided parameters', () => {
        const message = 'Test message';
        const level = 'info';
        const timeout = 5000;
        const created = 1600000000000; // Use a specific timestamp

        const alert = new Alert({ message, level, timeout, created });

        expect(alert.message).toBe(message);
        expect(alert.level).toBe(level);
        expect(alert.timeout).toBe(timeout);
        expect(alert.created).toBe(created);
    });

    it('should set default values for timeout and created if not provided', () => {
        const message = 'Test message';
        const level = 'success';
        const alert = new Alert({ message, level });

        expect(alert.timeout).toBe(0);
        expect(alert.created).toBeGreaterThan(0); // created should be the current timestamp
    });
});

describe('AlertController class', () => {
    it('should create and add an alert', () => {
        const alertController = new AlertController();
        const message = 'Test alert';
        const level = 'warning';
        const timeout = 1000;

        alertController.createAlert(level, message, timeout);
        const alerts = alertController.getAlerts();

        expect(alerts.length).toBe(1);
        expect(alerts[0].message).toBe(message);
        expect(alerts[0].level).toBe(level);
        expect(alerts[0].timeout).toBe(timeout);
    });

    it('should notify subscribers when a new alert is added', () => {
        const alertController = new AlertController();
        const subscriberMock = vi.fn();

        alertController.subscribe(subscriberMock);

        const alert = new Alert({
            message: 'Test alert',
            level: 'info',
            timeout: 500,
        });
        alertController.addAlert(alert);

        expect(subscriberMock).toHaveBeenCalledTimes(1);
        expect(subscriberMock).toHaveBeenCalledWith(alert);
    });
});

describe('createAlert function', () => {
    it('should call createAlert on the singleton AlertController instance', () => {
        const alertController = AlertController.getInstance();
        const createAlertSpy = vi.spyOn(alertController, 'createAlert');

        const message = 'Singleton Alert';
        const level = 'info';
        createAlert(level, message);

        expect(createAlertSpy).toHaveBeenCalledWith(level, message, undefined);

        createAlertSpy.mockRestore();
    });
});
