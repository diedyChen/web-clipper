import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.less';
import { Input, Button } from 'antd';
import { FormComponentProps } from '@ant-design/compatible/lib/form';
import Section from '@/components/section';
import { FormattedMessage } from 'react-intl';
import styles from './index.less';
import { useSelector, useDispatch } from 'dva';
import { GlobalStore, ClipperHeaderForm } from '@/common/types';
import { updateClipperHeader, asyncCreateDocument } from '@/actions/clipper';
import { asyncRunExtension } from '@/actions/userPreference';
import { isEqual } from 'lodash';
import { ServiceMeta, Repository } from '@/common/backend';
import classNames from 'classnames';
import localeService from '@/common/locales';
import Container from 'typedi';
import { IExtensionContainer } from '@/service/common/extension';
import { IExtensionWithId } from '@/extensions/common';
import { useObserver } from 'mobx-react';

type PageProps = FormComponentProps & {
  pathname: string;
  service: ServiceMeta | null;
  currentRepository?: Repository;
  hasAccount: boolean;
};

const ClipperHeader: React.FC<PageProps> = props => {
  const {
    form: { getFieldDecorator, validateFields, getFieldsValue, setFieldsValue },
    form,
    pathname,
    service,
    currentRepository,
    hasAccount,
  } = props;
  const formValue = getFieldsValue() as ClipperHeaderForm;
  const ref = useRef<ClipperHeaderForm>(formValue);
  const { loading, clipperHeaderForm } = useSelector((g: GlobalStore) => {
    return {
      loading: g.loading.effects[asyncCreateDocument.started.type],
      clipperHeaderForm: g.clipper.clipperHeaderForm,
    };
  }, isEqual);
  const dispatch = useDispatch();

  const fallbackExtensions = useObserver(() => {
    const availableExtensions = Container.get(IExtensionContainer).extensions;
    const findExtension = (id: string) => availableExtensions.find(o => o.id === id);
    return {
      copy: findExtension('web-clipper/copyToClipboard'),
      download: findExtension('web-clipper/download'),
    } as Record<'copy' | 'download', IExtensionWithId | undefined>;
  });

  const runFallbackExtension = useCallback(
    (extension?: IExtensionWithId) => {
      if (!extension) {
        return;
      }
      dispatch(asyncRunExtension.started({ pathname, extension }));
    },
    [dispatch, pathname]
  );

  useEffect(() => {
    if (isEqual(clipperHeaderForm, ref.current)) {
      return;
    }
    setFieldsValue(clipperHeaderForm);
  }, [clipperHeaderForm, formValue, setFieldsValue]);

  useEffect(() => {
    if (isEqual(ref.current, formValue)) {
      return;
    }
    dispatch(updateClipperHeader(formValue));
    ref.current = formValue;
  }, [dispatch, formValue]);

  const handleSubmit = () => {
    validateFields(err => {
      if (err) {
        return;
      }
      dispatch(asyncCreateDocument.started({ pathname }));
    });
  };

  const headerForm = useMemo(() => {
    const HeaderForm = service?.headerForm;
    return HeaderForm ? <HeaderForm form={form} currentRepository={currentRepository} /> : null;
  }, [currentRepository, form, service]);

  return (
    <Section
      title={<FormattedMessage id="tool.title" defaultMessage="Title" />}
      className={classNames(styles.header, styles.section)}
    >
      <Form.Item>
        {getFieldDecorator('title', {
          rules: [
            {
              required: true,
              message: <FormattedMessage id="tool.title.required" />,
            },
          ],
        })(<Input placeholder="Please Input Title" />)}
      </Form.Item>
      {headerForm}
      {hasAccount ? (
        <Button
          className={styles.saveButton}
          size="large"
          type="primary"
          title={
            !currentRepository
              ? localeService.format({
                  id: 'tool.saveButton.noRepository',
                })
              : ''
          }
          onClick={handleSubmit}
          loading={loading}
          disabled={loading || pathname === '/' || !currentRepository}
          block
        >
          <FormattedMessage id="tool.save" defaultMessage="Save Content" />
        </Button>
      ) : (
        <div className={styles.saveFallback}>
          <p className={styles.saveFallbackMessage}>
            <FormattedMessage
              id="tool.save.noAccount"
              defaultMessage="No account connected. Copy or download the content instead."
            />
          </p>
          <Button
            block
            className={styles.saveFallbackButton}
            onClick={() => runFallbackExtension(fallbackExtensions.copy)}
            disabled={!fallbackExtensions.copy}
            type="primary"
          >
            <FormattedMessage
              id="tool.save.copy"
              defaultMessage="Copy to Clipboard"
            />
          </Button>
          <Button
            block
            className={styles.saveFallbackButton}
            onClick={() => runFallbackExtension(fallbackExtensions.download)}
            disabled={!fallbackExtensions.download}
          >
            <FormattedMessage
              id="tool.save.download"
              defaultMessage="Download Markdown"
            />
          </Button>
        </div>
      )}
    </Section>
  );
};

export default Form.create<PageProps>()(ClipperHeader);
