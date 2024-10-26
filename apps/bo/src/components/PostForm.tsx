import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Upload,
  Switch,
  DatePicker,
  Button,
  message,
  Row,
  Col,
  Card,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '../quill-image-resize.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { uploadImage } from '../services/api';
import { FormValues, Post } from '../types/post';
import { quillFormats, createQuillModules } from '../config/quillConfig';
import { UploadChangeParam } from 'antd/lib/upload';
import { UploadFile } from 'antd/es/upload/interface';

dayjs.extend(utc);

const { Option } = Select;
const { RangePicker } = DatePicker;

interface PostFormProps {
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  initialValues?: Post;
}

const PostForm: React.FC<PostFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [previewImage, setPreviewImage] = useState<string | null>(
    initialValues?.coverImage || null
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    initialValues?.coverImage || null
  );
  const [content, setContent] = useState(initialValues?.content || '');
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        publishDateRange: [
          dayjs.utc(initialValues.publishStartDate),
          dayjs.utc(initialValues.publishEndDate),
        ],
      });
      console.log('🚀 ~ useEffect ~ initialValues:', initialValues.content);
      setContent(initialValues.content);
      setPreviewImage(initialValues.coverImage);
      setCoverImageUrl(initialValues.coverImage);
    } else {
      form.resetFields();
      setContent('');
      setPreviewImage(null);
      setCoverImageUrl(null);
    }
  }, [initialValues, form]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      if (input.files) {
        const file = input.files[0];
        const { imageUrl } = await uploadImage(file);
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', imageUrl);
        }
      }
    };
  }, []);

  const handleCoverImageUpload = useCallback(
    async (info: UploadChangeParam<UploadFile<File>>) => {
      const { file } = info;
      let fileToUpload: File | Blob | undefined;

      if (file instanceof File) {
        fileToUpload = file;
      } else if (file instanceof Blob) {
        fileToUpload = file;
      } else if (file.originFileObj) {
        fileToUpload = file.originFileObj;
      } else if (file.url) {
        setPreviewImage(file.url);
        setCoverImageUrl(file.url);
        return;
      } else {
        console.warn(`Unsupported file type: ${file.name}`);
        message.warning(
          `Unable to process ${file.name}. Please try a different file.`
        );
        return;
      }

      if (fileToUpload) {
        try {
          const response = await uploadImage(fileToUpload);
          setPreviewImage(response.imageUrl);
          setCoverImageUrl(response.imageUrl);
        } catch (error) {
          console.error('Error uploading cover image:', error);
          message.error('Upload failed: ' + (error.message || 'Unknown error'));
        }
      } else {
        message.error(`Can't handle ${file.name}.`);
      }
    },
    []
  );

  const handleSubmit = (values: FormValues) => {
    const [publishStartDate, publishEndDate] = values.publishDateRange;
    const contentHtml = quillRef.current?.getEditor().root.innerHTML;
    console.log('🚀 ~ handleSubmit ~ contentHtml:', contentHtml);

    const postData = {
      ...values,
      content: contentHtml,
      coverImage: coverImageUrl,
      publishStartDate: publishStartDate.utc().toDate(),
      publishEndDate: publishEndDate.utc().toDate(),
    };
    delete postData.publishDateRange;

    onSubmit(postData);
  };

  const quillModules = React.useMemo(
    () => createQuillModules(handleImageUpload),
    [handleImageUpload]
  );

  return (
    <Card style={{ marginBottom: '16px' }}>
      <Form form={form} onFinish={handleSubmit} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="title"
              label="Title"
              rules={[
                { required: true, message: 'Please input the title!' },
                {
                  max: 100,
                  message: 'Title cannot be longer than 100 characters',
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Please select a category!' }]}
            >
              <Select placeholder="Select Category">
                <Option value="News">News</Option>
                <Option value="Promo">Promo</Option>
                <Option value="Event">Event</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="coverImage" label="Cover Image">
          <Upload
            name="file"
            listType="picture-card"
            className="avatar-uploader"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleCoverImageUpload}
          >
            {previewImage ? (
              <img src={previewImage} alt="cover" style={{ width: '100%' }} />
            ) : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item
          label="Content"
          rules={[{ required: true, message: 'Please input the content!' }]}
        >
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={setContent}
            modules={quillModules}
            formats={quillFormats}
            theme="snow"
            style={{ height: '300px', marginBottom: '50px' }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="isActive" label="Status" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="publishDateRange"
              label="Publish Date Range"
              rules={[
                {
                  required: true,
                  message: 'Please select the publish date range!',
                },
              ]}
            >
              <RangePicker
                showTime
                format="YYYY-MM-DD HH A"
                allowClear={false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            {initialValues ? 'Update' : 'Submit'}
          </Button>
          <Button style={{ marginLeft: '8px' }} onClick={onCancel}>
            Cancel
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default PostForm;
