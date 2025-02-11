import EDiscovery from '@webex/internal-plugin-ediscovery';
import ReportRequest from '@webex/internal-plugin-ediscovery/src/report-request';
import {InvalidEmailAddressError} from '@webex/internal-plugin-ediscovery/src/ediscovery-error';
import Encryption from '@webex/internal-plugin-encryption';
import Mercury from '@webex/internal-plugin-mercury';
import MockWebex from '@webex/test-helper-mock-webex';
import sinon from 'sinon';
import {expect} from '@webex/test-helper-chai';
import config from '@webex/internal-plugin-ediscovery/src/config';

/* eslint-disable max-len */
describe('EDiscovery Report API Tests', () => {
  let webex;
  const uuid = 'cc06f622-46ab-45b9-b3a6-5d70bad1d70a';
  const defaultTimeout = 30000;
  const reportRequest = new ReportRequest();

  beforeEach(() => {
    webex = new MockWebex({
      children: {
        ediscovery: EDiscovery,
        encryption: Encryption,
        mercury: Mercury
      }
    });
    webex.config.ediscovery = config.ediscovery;
  });

  describe('CreateReport Tests', () => {
    it('CreateReport succeeds', async () => {
      const result = webex.internal.ediscovery.createReport(reportRequest)
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('CreateReport fails with no param', async () => {
      const result = expect(webex.internal.ediscovery.createReport()).to.be.rejectedWith(Error, 'Undefined parameter');

      return result;
    });

    it('CreateReport timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.createReport(reportRequest)
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('CreateReport timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.createReport(reportRequest, {timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });

    it('CreateReport with invalid emails fails with InvalidEmailAddressError', async () => {
      const invalidEmails = ['invalidEmail1@test.com', 'invalidEmail2@test.com'];
      const error = Error();

      error.message = JSON.stringify(invalidEmails);
      error.errorCode = InvalidEmailAddressError.getErrorCode();
      const result = webex.internal.ediscovery._handleReportRequestError({body: error})
        .catch((response) => {
          const invalidEmailsError = new InvalidEmailAddressError(invalidEmails);

          expect(response.name).to.equal(invalidEmailsError.name);
          expect(JSON.stringify(response.message)).to.equal(JSON.stringify(invalidEmailsError.message));
        });

      return result;
    });
  });

  describe('GetReports Tests', () => {
    it('GetReports succeeds', async () => {
      const result = webex.internal.ediscovery.getReports({})
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('GetReports timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.getReports()
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('GetReports timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.getReports({timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });
  });

  describe('GetReport Tests', () => {
    it('GetReport succeeds', async () => {
      const result = webex.internal.ediscovery.getReport(uuid)
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('GetReport fails with no params', async () => {
      const result = expect(webex.internal.ediscovery.getReport()).to.be.rejectedWith(Error, 'Undefined parameter');

      return result;
    });

    it('GetReport timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.getReport(uuid)
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('GetReport timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.getReport(uuid, {timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });
  });

  describe('DeleteReport Tests', () => {
    it('DeleteReport suceeds', async () => {
      const result = webex.internal.ediscovery.deleteReport(uuid)
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('DeleteReport fails with no params', async () => {
      const result = expect(webex.internal.ediscovery.deleteReport()).to.be.rejectedWith(Error, 'Undefined parameter');

      return result;
    });

    it('DeleteReport timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.deleteReport(uuid)
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('DeleteReport timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.deleteReport(uuid, {timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });
  });

  describe('RestartReport Tests', () => {
    it('RestartReport succeeds', async () => {
      const result = webex.internal.ediscovery.restartReport(uuid)
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('RestartReport fails with no params', async () => {
      const result = expect(webex.internal.ediscovery.restartReport()).to.be.rejectedWith(Error, 'Undefined parameter');

      return result;
    });

    it('RestartReport timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.restartReport(uuid)
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('RestartReport timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.restartReport(uuid, {timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });
  });

  describe('GetClientConfig Tests', () => {
    it('GetClientConfig succeeds', async () => {
      const result = webex.internal.ediscovery.getClientConfig()
        .then((res) => {
          expect(res.statusCode).to.equal(200);
        });

      return result;
    });

    it('GetClientConfig timeout defaults to 30s', async () => {
      const result = webex.internal.ediscovery.getClientConfig()
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', defaultTimeout));
        });

      return result;
    });

    it('GetClientConfig timeout can be overwritten to 5s', async () => {
      const result = webex.internal.ediscovery.getClientConfig({timeoutMs: 5000})
        .then(() => {
          sinon.assert.calledWith(webex.request, sinon.match.has('timeout', 5000));
        });

      return result;
    });
  });
});
