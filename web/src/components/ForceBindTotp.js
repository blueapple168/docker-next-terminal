import React, {useEffect, useState} from 'react';
import {Button, Card, Form, Image, Input, message, Space, Typography} from "antd";
import {ReloadOutlined, SafetyCertificateOutlined} from "@ant-design/icons";
import {useNavigate} from "react-router-dom";
import accountApi from "../api/account";
import brandingApi from "../api/branding";
import {setCurrentUser} from "../service/permission";

const {Title, Text, Paragraph} = Typography;

/**
 * 强制绑定双因素认证页。
 *
 * 当管理员对某个账户开启了"强制双因素认证"，而该账户尚未绑定时，
 * 服务端会把除 /account 之外的所有接口拦截为 code=1001，
 * 前端统一跳转到本页面，绑定成功后才放行进入系统。
 */
const ForceBindTotp = () => {

    const navigate = useNavigate();

    let [branding, setBranding] = useState({});
    let [totp, setTotp] = useState({});
    let [loading, setLoading] = useState(false);
    let [submitting, setSubmitting] = useState(false);

    const goHome = (info) => {
        if (info && info['type']) {
            setCurrentUser(info);
            navigate(info['type'] === 'user' ? '/my-asset' : '/');
        } else {
            navigate('/');
        }
    };

    const loadQrCode = async () => {
        setLoading(true);
        try {
            let data = await accountApi.reloadTotp();
            setTotp(data || {});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const x = async () => {
            let info = await accountApi.getUserInfo();
            // 已经绑定过（或管理员已取消强制），无需停留在此页
            if (info && !info['needBindTotp']) {
                goHome(info);
                return;
            }
            let b = await brandingApi.getBranding();
            document.title = b['name'];
            setBranding(b);
            await loadQrCode();
        };
        x();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const confirmTOTP = async (values) => {
        setSubmitting(true);
        try {
            values['secret'] = totp['secret'];
            let success = await accountApi.confirmTotp(values);
            if (success) {
                message.success('双因素认证绑定成功');
                let info = await accountApi.getUserInfo();
                goHome(info);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            width: '100vw',
            minHeight: '100vh',
            backgroundColor: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 16px'
        }}>
            <Card style={{width: 620, maxWidth: '100%'}}>
                <div style={{textAlign: 'center', marginBottom: 24, color: '#1890ff'}}>
                    <Title level={3} style={{marginBottom: 8}}>
                        <SafetyCertificateOutlined/> 请先绑定双因素认证
                    </Title>
                    <Text type="secondary">{branding['name']}</Text>
                </div>

                <Paragraph type="warning" style={{textAlign: 'center', marginBottom: 24}}>
                    管理员已为该账户开启强制双因素认证。为保障账号安全，
                    您必须完成绑定后才能继续使用系统，本页面无法跳过。
                </Paragraph>

                <Form onFinish={confirmTOTP} labelCol={{span: 4}} wrapperCol={{span: 20}}>
                    <Form.Item label="二维码"
                               extra={'有效期30秒，在扫描后请尽快输入。推荐使用 Google Authenticator、Authy 或 Microsoft Authenticator。'}>
                        <Space size={12} direction='horizontal' align='center'>
                            {
                                totp['qr'] ?
                                    <Image
                                        style={{padding: 10, border: '1px solid #f0f0f0'}}
                                        width={200}
                                        src={"data:image/png;base64, " + totp['qr']}
                                    /> : null
                            }
                            <Button
                                type="primary"
                                icon={<ReloadOutlined/>}
                                loading={loading}
                                onClick={loadQrCode}
                            >
                                重新加载
                            </Button>
                        </Space>
                    </Form.Item>

                    <Form.Item
                        name="totp"
                        label="授权码"
                        rules={[{required: true, message: '请输入双因素认证APP中显示的授权码'}]}
                    >
                        <Input placeholder="请输入双因素认证APP中显示的授权码" autoComplete="off"/>
                    </Form.Item>

                    <Form.Item wrapperCol={{span: 20, offset: 4}}>
                        <Space>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                确认绑定
                            </Button>
                            <Button onClick={async () => {
                                await accountApi.logout();
                                navigate('/login');
                            }}>
                                退出登录
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ForceBindTotp;
