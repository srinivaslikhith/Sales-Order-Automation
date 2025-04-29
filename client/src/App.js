import React, { useState } from 'react';
import 'antd/dist/reset.css';
import { Layout, Tabs, Button, Table, Modal, Input, Form, Select, Spin } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;


export default function App() {
  // PDF & loading
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Extracted header fields
  const [extractData, setExtractData] = useState({
    requestId: '',
    address: '',
    poDate: '',
    poNumber: ''
  });

  // Line‐item matches
  const [items, setItems] = useState([]); // { key, original, suggestions: [{id,name}], selected }

  // Modal editing (optional deeper edits)
  const [editingItem, setEditingItem] = useState(null);

  // 1) Handle “Generate Mapping”
  async function handleUpload() {
    if (!file) return;
    setLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      // TODO: point to your real Flask URL
      const res = await axios.post('http://127.0.0.1:8002/api/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Expect { lineItems: [...] } with suggestions included
      const { lineItems } = res.data;

      // Optionally clear extractData if needed:
      // setExtractData({ requestId:'', address:'', poDate:'', poNumber:'' });

      setItems(
        lineItems.map((li, idx) => {
          const originalText = typeof li.original === 'object' && li.original['Request Item']
            ? li.original['Request Item']
            : li.original;
          const mappedSugg = (li.suggestions || []).map(s => ({
            id: s.match,
            name: s.match
          }));
          return {
            key: idx,
            original: originalText,
            suggestions: mappedSugg,
            selected: mappedSugg[0]?.id || ''
          };
        })
      );
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  }

  // 2) Handle selection change in table
  const onSelectChange = (key, newId) => {
    setItems(items.map(it =>
      it.key === key ? { ...it, selected: newId } : it
    ));
  };

  // 3) Export CSV via Papaparse
  const handleExport = () => {
    if (items.length === 0) return;
    import('papaparse').then(({ unparse }) => {
      const rows = items.map(it => ({
        original: it.original,
        selection: it.suggestions.find(s => s.id === it.selected)?.name || ''
      }));
      const csv = unparse(rows, { header: true });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'order.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Table columns for “Match” tab
  const columns = [
    {
      title: 'Original',
      dataIndex: 'original',
      key: 'original',
      ellipsis: true,
    },
    {
      title: 'Top Match',
      dataIndex: 'selected',
      key: 'selected',
      render: (val, row) => {
        return (
          <Select
            value={val}
            style={{ width: 200 }}
            onChange={newId => onSelectChange(row.key, newId)}
          >
            {row.suggestions.map(s => (
              <Option key={s.id} value={s.id}>{s.name}</Option>
            ))}
          </Select>
        );
      }
    },
    {
      title: 'Edit',
      key: 'edit',
      render: (_, row) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => setEditingItem(row)}
        />
      )
    }
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Left: PDF preview / upload dropzone */}
      <Sider width="50%" style={{ background: '#f0f2f5', overflow: 'auto' }}>
        <div
          style={{
            height: '100%',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: '#999'
          }}
        >
          <span>{file ? file.name : "Drag PDF here or click to upload"}</span>
          <input
            type="file"
            accept="application/pdf"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
            onChange={e => {
              if (e.target.files.length) setFile(e.target.files[0]);
            }}
          />
        </div>
      </Sider>

      {/* Right: Tabs */}
      <Layout>
        <Content style={{ padding: 24 }}>
          <Tabs defaultActiveKey="1">
            {/* Upload */}
            <TabPane tab="Upload" key="1">
              <Button
                type="primary"
                disabled={!file || loading}
                onClick={handleUpload}
              >
                {loading ? 'Generating…' : 'Generate Mapping'}
              </Button>
            </TabPane>

            {/* Extract */}
            <TabPane tab="Extract" key="2">
              <Form layout="vertical" style={{ maxWidth: 400 }}>
                <Form.Item label="Request ID">
                  <Input value={extractData.requestId} readOnly />
                </Form.Item>
                <Form.Item label="Delivery Address">
                  <Input
                    value={extractData.address}
                    onChange={e => setExtractData(d => ({ ...d, address: e.target.value }))}
                  />
                </Form.Item>
                <Form.Item label="PO Date">
                  <Input
                    value={extractData.poDate}
                    onChange={e => setExtractData(d => ({ ...d, poDate: e.target.value }))}
                  />
                </Form.Item>
                <Form.Item label="PO Number">
                  <Input
                    value={extractData.poNumber}
                    onChange={e => setExtractData(d => ({ ...d, poNumber: e.target.value }))}
                  />
                </Form.Item>
              </Form>
            </TabPane>

            {/* Match */}
            <TabPane tab="Match" key="3">
              <Table
                columns={columns}
                dataSource={items}
                pagination={false}
                rowKey="key"
              />
              {items.length > 0 && (
                <Button
                  type="primary"
                  style={{ marginTop: 16 }}
                  onClick={handleExport}
                >
                  Export CSV
                </Button>
              )}
            </TabPane>
          </Tabs>
        </Content>
      </Layout>

      {/* Optional: Edit Modal */}
      <Modal
        title="Edit Product Matching"
        open={!!editingItem}
        footer={null}
        onCancel={() => setEditingItem(null)}
      >
        {editingItem && (
          <Form
            initialValues={{ selected: editingItem.selected }}
            onFinish={vals => {
              onSelectChange(editingItem.key, vals.selected);
              setEditingItem(null);
            }}
          >
            <Form.Item label="Request Item">
              <Input readOnly value={editingItem.original} />
            </Form.Item>

            <Form.Item label="Select Match" name="selected">
              <Select>
                {editingItem.suggestions.map(s => (
                  <Option key={s.id} value={s.id}>{s.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">Save</Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Layout>
  );
}