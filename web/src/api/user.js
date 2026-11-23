import Api from "./api";
import request from "../common/request";

class UserApi extends Api {
    constructor() {
        super("users");
    }

    resetTotp = async (id) => {
        let result = await request.post(`/${this.group}/${id}/reset-totp`);
        return result['code'] === 1;
    }

    /**
     * 强制开启/取消强制开启双因素认证。
     * id 支持逗号分隔的批量 ID，force 为 false 时表示取消强制。
     */
    forceTotp = async (id, force = true) => {
        let formData = new FormData();
        formData.set('force', force ? 'true' : 'false');
        let result = await request.post(`/${this.group}/${id}/force-totp`, formData);
        return result['code'] === 1;
    }

    changePassword = async (id, password) => {
        let formData = new FormData();
        formData.set('password', password);
        let result = await request.post(`/${this.group}/${id}/change-password`, formData);
        return result['code'] === 1;
    }

    changeStatus = async (id, status) => {
        let result = await request.patch(`/${this.group}/${id}/status?status=${status}`);
        return result['code'] !== 1;
    }
}

const userApi = new UserApi();
export default userApi;
