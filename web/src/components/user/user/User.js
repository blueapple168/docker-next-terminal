import React, {useState} from 'react';

import {Button, Input, Layout, message, Modal, Popconfirm, Switch, Table, Tag} from "antd";
import UserModal from "./UserModal";
import {Link, useNavigate} from "react-router-dom";
import {ProTable, TableDropdown} from "@ant-design/pro-components";
import userApi from "../../../api/user";
import arrays from "../../../utils/array";
import {ExclamationCircleOutlined, LockTwoTone} from "@ant-design/icons";
import strings from "../../../utils/strings";
import ColumnState, {useColumnState} from "../../../hook/column-state";
import {hasMenu} from "../../../service/permission";
import Show from "../../../dd/fi/show";

const api = userApi;

const {Content} = Layout;

const actionRef = React.createRef();

const User = () => {
    let [visible, setVisible] = useState(false);
    let [confirmLoading, setConfirmLoading] = useState(false);
    let [selectedRowKey, setSelectedRowKey] = useState(undefined);
    let [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const [columnsStateMap, setColumnsStateMap] = useColumnState(ColumnState.USER);
    let navigate = useNavigate();

    const columns = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        }, {
            title: '用户昵称',
            dataIndex: 'nickname',
            key: 'nickname',
            sorter: true,
            render: (text, record) => {
                let view = <div>{text}</div>;
                if (hasMenu('user-detail')) {
                    view = <Link to={`/user/${record['id']}`}>{text}</Link>;
                }
                return view;
            }
        }, {
            title: '登录账号',
            dataIndex: 'username',
            key: 'username',
            sorter: true,
        }, {
            title: '邮箱',
            dataIndex: 'mail',
            key: 'mail',
        }, {
            title: '双因素认证',
            dataIndex: 'enabledTotp',
            key: 'enabledTotp',
            hideInSearch: true,
            width: 140,
            render: (enabledTotp, record) => {
                if (enabledTotp) {
                    return <Tag color="green">已开启</Tag>;
                }
                if (record['forceTotp']) {
                    return <Tag color="orange">未开启（强制待绑定）</Tag>;
                }
                return <Tag color="red">未开启</Tag>;
            }
        }, {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            hideInSearch: true,
            render: (status, record, index) => {
                return <Switch checkedChildren="启用" unCheckedChildren="禁用"
                               checked={status !== 'disabled'}
                               onChange={checked => {
                                   handleChangeUserStatus(record['id'], checked, index);
                               }}/>
            }
        }, {
            title: '在线状态',
            dataIndex: 'online',
            key: 'online',
            valueType: 'radio',
            sorter: true,
            valueEnum: {
                true: {text: '在线', status: 'success'},
                false: {text: '离线', status: 'default'},
            },
        },
        {
            title: '创建时间',
            key: 'created',
            dataIndex: 'created',
            hideInSearch: true,
        },
        {
            title: '操作',
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Show menu={'user-edit'} key={'user-edit'}>
                    <a
                        key="edit"
                        onClick={() => {
                            setVisible(true);
                            setSelectedRowKey(record['id']);
                        }}
                    >
                        编辑
                    </a>
                </Show>
                ,
                <Show menu={'user-del'} key={'user-del'}>
                    <Popconfirm
                        key={'confirm-delete'}
                        title="您确认要删除此行吗?"
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            actionRef.current.reload();
                        }}
                        okText="确认"
                        cancelText="取消"
                    >
                        <a key='delete' className='danger'>删除</a>
                    </Popconfirm>
                </Show>,
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'user-detail':
                                navigate(`/user/${record['id']}?activeKey=info`);
                                break;
                            case 'user-authorised-asset':
                                navigate(`/user/${record['id']}?activeKey=asset`);
                                break;
                            case 'user-login-policy':
                                navigate(`/user/${record['id']}?activeKey=login-policy`);
                                break;
                            case 'user-force-totp':
                                doForceTotp(record['id'], !record['forceTotp']);
                                break;
                            case 'user-reset-totp':
                                doResetTotp(record['id']);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'user-detail', name: '详情', disabled: !hasMenu('user-detail')},
                        {key: 'user-authorised-asset', name: '授权资产', disabled: !hasMenu('user-authorised-asset')},
                        {key: 'user-login-policy', name: '登录策略', disabled: !hasMenu('user-login-policy')},
                        {
                            key: 'user-force-totp',
                            name: record['forceTotp'] ? '取消强制双因素认证' : '强制开启双因素认证',
                            disabled: !hasMenu('user-force-totp')
                        },
                        {
                            key: 'user-reset-totp',
                            name: '重置双因素认证',
                            disabled: !hasMenu('user-reset-totp') || !record['enabledTotp']
                        },
                    ]}
                />,
            ],
        },
    ];

    const handleChangeUserStatus = async (id, checked, index) => {
        await api.changeStatus(id, checked ? 'enabled' : 'disabled');
        actionRef.current.reload();
    }

    /**
     * 重置双因素认证：清空已绑定的 TOTP 并强制用户重新绑定。
     * ids 支持逗号分隔的批量 ID。
     */
    const doResetTotp = (ids) => {
        const count = ids ? ids.split(',').length : 0;
        if (count === 0) {
            message.warn('请先选择用户');
            return;
        }
        Modal.confirm({
            title: '重置双因素认证',
            icon: <ExclamationCircleOutlined/>,
            content: `已选中 ${count} 个账户。重置后其已绑定的双因素认证将被清空，`
                + '当前登录会话会被强制下线，下次登录时必须重新绑定双因素认证才能使用系统。',
            okText: '确认重置',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                return new Promise(async (resolve) => {
                    const success = await api.resetTotp(ids);
                    resolve();
                    if (success) {
                        message.success('重置成功，用户下次登录需重新绑定双因素认证');
                        actionRef.current.reload();
                    }
                }).catch(() => console.log('Oops errors!'))
            },
        });
    }

    /**
     * 强制开启 / 取消强制开启双因素认证。
     * ids 支持逗号分隔的批量 ID。
     */
    const doForceTotp = (ids, force) => {
        const count = ids ? ids.split(',').length : 0;
        if (count === 0) {
            message.warn('请先选择用户');
            return;
        }
        Modal.confirm({
            title: force ? '强制开启双因素认证' : '取消强制双因素认证',
            icon: <ExclamationCircleOutlined/>,
            content: force
                ? `已选中 ${count} 个账户。开启后，未绑定双因素认证的用户下次登录时必须先完成绑定才能使用系统。`
                : `已选中 ${count} 个账户。取消后，未绑定双因素认证的用户将不再被强制要求绑定。`,
            okText: '确认',
            cancelText: '取消',
            onOk() {
                return new Promise(async (resolve) => {
                    const success = await api.forceTotp(ids, force);
                    resolve();
                    if (success) {
                        message.success(force ? '已开启强制双因素认证' : '已取消强制双因素认证');
                        actionRef.current.reload();
                    }
                }).catch(() => console.log('Oops errors!'))
            },
        });
    }

    const handleChangePassword = () => {
        let password = '';
        Modal.confirm({
            title: '修改密码',
            icon: <LockTwoTone/>,
            content: <Input.Password onChange={e => password = e.target.value} placeholder="请输入新密码"/>,
            onOk() {
                return new Promise(async (resolve, reject) => {
                    if (!strings.hasText(password)) {
                        reject();
                        message.warn("请输入密码");
                        return;
                    }
                    await api.changePassword(selectedRowKeys.join(','), password);
                    resolve();
                    message.success("修改成功");
                }).catch(() => console.log('Oops errors!'))
            },
        });
    }

    return (<Content className="page-container">
        <ProTable
            columns={columns}
            actionRef={actionRef}
            columnsState={{
                value: columnsStateMap,
                onChange: setColumnsStateMap
            }}
            rowSelection={{
                // 自定义选择项参考: https://ant.design/components/table-cn/#components-table-demo-row-selection-custom
                // 注释该行则默认不显示下拉选项
                selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                selectedRowKeys: selectedRowKeys,
                onChange: (keys) => {
                    setSelectedRowKeys(keys);
                }
            }}
            request={async (params = {}, sort, filter) => {

                let field = '';
                let order = '';
                if (Object.keys(sort).length > 0) {
                    field = Object.keys(sort)[0];
                    order = Object.values(sort)[0];
                }

                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    nickname: params.nickname,
                    username: params.username,
                    mail: params.mail,
                    online: params.online,
                    field: field,
                    order: order
                }
                let result = await api.getPaging(queryParams);
                return {
                    data: result['items'],
                    success: true,
                    total: result['total']
                };
            }}
            rowKey="id"
            search={{
                labelWidth: 'auto',
            }}
            pagination={{
                defaultPageSize: 10,
            }}
            dateFormatter="string"
            headerTitle="用户列表"
            toolBarRender={() => [
                <Show menu={'user-add'}>
                    <Button key="button" type="primary" onClick={() => {
                        setVisible(true)
                    }}>
                        新建
                    </Button>
                </Show>,
                <Show menu={'user-change-password'}>
                    <Button key="button"
                            disabled={arrays.isEmpty(selectedRowKeys)}
                            onClick={handleChangePassword}>
                        修改密码
                    </Button>
                </Show>,
                <Show menu={'user-reset-totp'}>
                    <Button key="button"
                            disabled={arrays.isEmpty(selectedRowKeys)}
                            onClick={() => doResetTotp(selectedRowKeys.join(','))}>
                        重置双因素认证
                    </Button>
                </Show>,
                <Show menu={'user-force-totp'}>
                    <Button key="button-force-totp"
                            disabled={arrays.isEmpty(selectedRowKeys)}
                            onClick={() => doForceTotp(selectedRowKeys.join(','), true)}>
                        强制开启双因素认证
                    </Button>
                </Show>,
            ]}
        />

        <UserModal
            id={selectedRowKey}
            visible={visible}
            confirmLoading={confirmLoading}
            handleCancel={() => {
                setVisible(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={async (values) => {
                setConfirmLoading(true);

                try {
                    let success;
                    if (values['id']) {
                        success = await api.updateById(values['id'], values);
                    } else {
                        success = await api.create(values);
                    }
                    if (success) {
                        setVisible(false);
                    }
                    actionRef.current.reload();
                } finally {
                    setConfirmLoading(false);
                }
            }}
        />

    </Content>);
}

export default User;
